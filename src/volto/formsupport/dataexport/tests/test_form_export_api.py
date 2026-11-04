"""
Tests for POST @form-export-api

Run with:
    python -m pytest src/volto/formsupport/dataexport/tests/ -v
"""

import json
import sys
import unittest
from unittest.mock import MagicMock, patch

# Provide shims for plone / zope imports if not in a full Plone instance
for mod_name in [
    "zope",
    "zope.interface",
    "zope.publisher",
    "zope.publisher.interfaces",
    "plone",
    "plone.restapi",
    "plone.restapi.deserializer",
    "plone.restapi.services",
]:
    if mod_name not in sys.modules:
        m = MagicMock()
        if mod_name == "zope.interface":
            m.implementer = lambda *args: (lambda cls: cls)
        elif mod_name == "plone.restapi.services":
            class BaseService:
                def __init__(self, context, request):
                    self.context = context
                    self.request = request
            m.Service = BaseService
        sys.modules[mod_name] = m

from volto.formsupport.dataexport.services.form_export_api.post import (
    FormExportApiPost,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

SAMPLE_FORM_DATA = [
    {"field_id": "name", "value": "Jane Doe"},
    {"field_id": "email", "value": "jane@example.com"},
    {"field_id": "message", "value": "Hello!"},
]

DEST_BASIC = {
    "id": "dest-1",
    "label": "Test API",
    "enabled": True,
    "url": "https://api.example.com/hook",
    "method": "POST",
    "auth_type": "none",
    "auth_token": "",
    "extra_headers": {},
    "payload_template": "",
    "include_metadata": False,
}


def _make_service(block_id="block-abc", destinations=None):
    """Build a FormExportApiPost instance with a mocked Plone context."""
    if destinations is None:
        destinations = [DEST_BASIC]

    context = MagicMock()
    context.getPhysicalPath.return_value = ["", "plone", "my-page"]
    context.blocks = {block_id: {"export_destinations": destinations}}

    request = MagicMock()
    request.response = MagicMock()

    service = FormExportApiPost(context, request)
    return service


def _make_body(block_id="block-abc", destination_id="dest-1", form_data=None):
    return {
        "block_id": block_id,
        "destination_id": destination_id,
        "form_data": form_data or SAMPLE_FORM_DATA,
    }


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestFormExportApiPost(unittest.TestCase):

    # ── Validation ────────────────────────────────────────────────────────

    def test_missing_block_id_returns_400(self):
        service = _make_service()
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value={"destination_id": "dest-1"},
        ):
            result = service.reply()
        service.request.response.setStatus.assert_called_with(400)
        self.assertIn("block_id", result["error"])

    def test_missing_destination_id_returns_400(self):
        service = _make_service()
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value={"block_id": "block-abc"},
        ):
            result = service.reply()
        service.request.response.setStatus.assert_called_with(400)

    def test_unknown_destination_returns_404(self):
        service = _make_service()
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(destination_id="no-such-dest"),
        ):
            result = service.reply()
        service.request.response.setStatus.assert_called_with(404)

    def test_disabled_destination_returns_skipped(self):
        dest = {**DEST_BASIC, "enabled": False}
        service = _make_service(destinations=[dest])
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ):
            result = service.reply()
        self.assertEqual(result["status"], "skipped")

    def test_empty_url_returns_422(self):
        dest = {**DEST_BASIC, "url": ""}
        service = _make_service(destinations=[dest])
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ):
            result = service.reply()
        service.request.response.setStatus.assert_called_with(422)

    # ── Auth header injection ─────────────────────────────────────────────

    def test_no_auth_sends_no_auth_header(self):
        service = _make_service()
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        self.assertNotIn("Authorization", kwargs["headers"])

    def test_bearer_auth_injects_header(self):
        dest = {**DEST_BASIC, "auth_type": "bearer", "auth_token": "mytoken123"}
        service = _make_service(destinations=[dest])
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer mytoken123")

    def test_basic_auth_injects_header(self):
        dest = {**DEST_BASIC, "auth_type": "basic", "auth_token": "user:pass"}
        service = _make_service(destinations=[dest])
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")

        import base64
        expected = "Basic " + base64.b64encode(b"user:pass").decode()

        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        self.assertEqual(kwargs["headers"]["Authorization"], expected)

    # ── Payload ───────────────────────────────────────────────────────────

    def test_no_template_sends_full_form_data(self):
        service = _make_service()
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        payload = kwargs["json"]
        self.assertIn("form_data", payload)
        self.assertEqual(payload["form_data"], SAMPLE_FORM_DATA)

    def test_payload_template_substitution(self):
        template = '{"name": "${name}", "email": "${email}"}'
        dest = {**DEST_BASIC, "payload_template": template}
        service = _make_service(destinations=[dest])
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        payload = kwargs["json"]
        self.assertEqual(payload["name"], "Jane Doe")
        self.assertEqual(payload["email"], "jane@example.com")

    def test_include_metadata_adds_path_and_timestamp(self):
        dest = {**DEST_BASIC, "include_metadata": True}
        service = _make_service(destinations=[dest])
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        payload = kwargs["json"]
        self.assertIn("page_path", payload)
        self.assertIn("submitted_at", payload)
        self.assertIn("destination_id", payload)

    # ── Error handling ────────────────────────────────────────────────────

    def test_external_api_error_returns_error_status(self):
        service = _make_service()
        mock_resp = MagicMock(ok=False, status_code=500, text="Internal Server Error")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ):
            result = service.reply()
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["response_code"], 500)

    def test_timeout_returns_504(self):
        import requests as req_lib
        service = _make_service()
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            side_effect=req_lib.Timeout,
        ):
            result = service.reply()
        service.request.response.setStatus.assert_called_with(504)
        self.assertEqual(result["status"], "error")
        self.assertIn("timed out", result["message"])

    def test_connection_error_returns_502(self):
        import requests as req_lib
        service = _make_service()
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            side_effect=req_lib.ConnectionError("connection refused"),
        ):
            result = service.reply()
        service.request.response.setStatus.assert_called_with(502)
        self.assertEqual(result["status"], "error")

    def test_extra_headers_forwarded(self):
        dest = {**DEST_BASIC, "extra_headers": {"X-Source": "plone", "X-Env": "prod"}}
        service = _make_service(destinations=[dest])
        mock_resp = MagicMock(ok=True, status_code=200, text="ok")
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ) as mock_req:
            service.reply()
        _, kwargs = mock_req.call_args
        self.assertEqual(kwargs["headers"]["X-Source"], "plone")
        self.assertEqual(kwargs["headers"]["X-Env"], "prod")

    def test_successful_call_returns_ok(self):
        service = _make_service()
        mock_resp = MagicMock(ok=True, status_code=201, text='{"id": 42}')
        with patch(
            "volto.formsupport.dataexport.services.form_export_api.post.json_body",
            return_value=_make_body(),
        ), patch(
            "volto.formsupport.dataexport.services.form_export_api.post.requests.request",
            return_value=mock_resp,
        ):
            result = service.reply()
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["response_code"], 201)


if __name__ == "__main__":
    unittest.main()
