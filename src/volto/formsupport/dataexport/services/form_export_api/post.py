"""
POST @form-export-api

Server-side proxy that forwards form submission data to a configured
external API endpoint.  Auth credentials (bearer tokens, basic auth) are
read from the block's server-side data and are never exposed to the browser.

Request body (JSON):
    {
        "block_id":       "<uuid of the form block>",
        "destination_id": "<uuid of the export destination>",
        "form_data":      [{"field_id": "name", "value": "Jane"}, ...]
    }

Response (JSON):
    {
        "status":        "ok" | "error" | "skipped",
        "response_code": <HTTP status code from the external API>,
        "message":       "<truncated response body or reason>"
    }

Permissions:
    zope2.View  — any user who can load the page (and therefore submit
                  the form) can reach this endpoint.  The block config
                  (with secrets) is only ever read server-side.
"""

import base64
import json
import logging
import re
from datetime import datetime, timezone

import requests
from plone.restapi.deserializer import json_body
from plone.restapi.services import Service
from zope.interface import implementer
from zope.publisher.interfaces import IPublishTraverse

logger = logging.getLogger(__name__)

# Maximum bytes of external API response body to echo back to the client
_MAX_RESPONSE_ECHO = 500

# Timeout (seconds) for outbound HTTP requests
_REQUEST_TIMEOUT = 15


@implementer(IPublishTraverse)
class FormExportApiPost(Service):
    """Proxy form submission data to a configured external API."""

    def reply(self):
        # ── 1. Parse request body ────────────────────────────────────────
        try:
            body = json_body(self.request)
        except Exception:
            self.request.response.setStatus(400)
            return {"error": "Invalid JSON body"}

        block_id = body.get("block_id")
        destination_id = body.get("destination_id")
        form_data = body.get("form_data", [])

        if not block_id or not destination_id:
            self.request.response.setStatus(400)
            return {"error": "block_id and destination_id are required"}

        # ── 2. Load destination config (server-side only) ────────────────
        dest = self._get_destination(block_id, destination_id)
        if dest is None:
            self.request.response.setStatus(404)
            return {"error": f"Destination '{destination_id}' not found in block '{block_id}'"}

        if not dest.get("enabled", True):
            return {"status": "skipped", "reason": "destination is disabled"}

        target_url = dest.get("url", "").strip()
        if not target_url:
            self.request.response.setStatus(422)
            return {"error": "Destination has no target URL configured"}

        # ── 3. Build outbound payload ────────────────────────────────────
        payload = self._build_payload(dest, form_data)

        # ── 4. Build outbound headers ────────────────────────────────────
        headers = {"Content-Type": "application/json"}
        extra = dest.get("extra_headers") or {}
        if isinstance(extra, dict):
            headers.update(extra)

        auth_type = dest.get("auth_type", "none")
        auth_token = dest.get("auth_token", "")
        if auth_type == "bearer" and auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        elif auth_type == "basic" and auth_token:
            encoded = base64.b64encode(auth_token.encode("utf-8")).decode("ascii")
            headers["Authorization"] = f"Basic {encoded}"

        # ── 5. Make the outbound request ─────────────────────────────────
        method = dest.get("method", "POST").upper()
        logger.info(
            "form-export-api: %s %s (block=%s dest=%s)",
            method, target_url, block_id, destination_id,
        )

        try:
            response = requests.request(
                method,
                target_url,
                json=payload,
                headers=headers,
                timeout=_REQUEST_TIMEOUT,
            )
        except requests.Timeout:
            logger.warning(
                "form-export-api: timeout calling %s", target_url
            )
            self.request.response.setStatus(504)
            return {
                "status": "error",
                "response_code": None,
                "message": f"Request to {target_url} timed out after {_REQUEST_TIMEOUT}s",
            }
        except requests.RequestException as exc:
            logger.error(
                "form-export-api: error calling %s: %s", target_url, exc
            )
            self.request.response.setStatus(502)
            return {
                "status": "error",
                "response_code": None,
                "message": str(exc),
            }

        status = "ok" if response.ok else "error"
        if not response.ok:
            logger.warning(
                "form-export-api: external API returned %s for %s",
                response.status_code, target_url,
            )

        return {
            "status": status,
            "response_code": response.status_code,
            "message": response.text[:_MAX_RESPONSE_ECHO],
        }

    # ── Helpers ──────────────────────────────────────────────────────────

    def _get_destination(self, block_id, destination_id):
        """Return the destination dict from the block's server-side config."""
        # Plone 6 / volto-form-block stores block data on the content item
        blocks = getattr(self.context, "blocks", None) or {}

        # `blocks` may be a PersistentMapping or plain dict
        block = blocks.get(block_id)
        if block is None:
            return None

        destinations = block.get("export_destinations") or []
        for dest in destinations:
            if isinstance(dest, dict) and dest.get("id") == destination_id:
                return dest
        return None

    def _build_payload(self, dest, form_data):
        """
        Build the JSON payload for the external API.

        If a `payload_template` is configured, it is used as a JSON string
        with ``${field_id}`` placeholders replaced by form field values.
        Otherwise the full form_data list is sent.

        If `include_metadata` is True, page path, block id, and timestamp
        are merged in at the top level.
        """
        metadata = {}
        if dest.get("include_metadata"):
            metadata = {
                "page_path": "/".join(self.context.getPhysicalPath()),
                "destination_id": dest.get("id"),
                "submitted_at": datetime.now(tz=timezone.utc).isoformat(),
            }

        template = (dest.get("payload_template") or "").strip()
        if not template:
            return {"form_data": form_data, **metadata}

        # Build a lookup dict: field_id → value
        field_map = {}
        for item in form_data:
            if isinstance(item, dict):
                fid = item.get("field_id") or item.get("name") or ""
                val = item.get("value", "")
                if isinstance(val, (dict, list)):
                    val = json.dumps(val)
                field_map[str(fid)] = str(val)

        # Replace ${field_id} placeholders
        substituted = re.sub(
            r"\$\{(\w+)\}",
            lambda m: field_map.get(m.group(1), ""),
            template,
        )

        try:
            parsed = json.loads(substituted)
            if isinstance(parsed, dict):
                return {**parsed, **metadata}
            return parsed  # array or scalar — return as-is
        except json.JSONDecodeError as exc:
            logger.warning(
                "form-export-api: payload_template produced invalid JSON after "
                "substitution: %s — falling back to raw form_data", exc
            )
            return {"form_data": form_data, **metadata}
