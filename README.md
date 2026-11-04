# volto.formsupport.dataexport

**Version:** 1.2.0

Standalone Plone REST API add-on providing the `POST @form-export-api` server-side proxy endpoint for [`volto-form-block-data-export`](https://github.com/rnunez80/volto-form-block-data-export).

---

## Overview

Provides the `POST <path>/@form-export-api` Plone REST service. When a visitor submits a Volto form block with **Stream data** enabled, `volto-form-block-data-export` dispatches an export request for each enabled destination to this Plone endpoint. Plone reads the destination configuration (URL, HTTP method, auth credentials, custom headers, and JSON payload template) from the content item's form block server-side and forwards the payload to the external API.

## Features

- **HTTP Methods:** `POST`, `PUT`, `PATCH`
- **Authentication:** `None`, `Bearer` token / API key, or HTTP `Basic` (`user:password`)
- **Custom HTTP Headers:** Forward arbitrary key/value headers (e.g., `X-API-Key`, `Accept`)
- **JSON Payload Templates:** Map form fields into custom JSON structures using `${field_id}` placeholders, or leave blank to send the raw `form_data` array
- **Metadata Injection:** Optionally include `page_path`, `destination_id`, and `submitted_at` (UTC ISO-8601)
- **Server-Side Security:** Secrets (`auth_token`) remain on the Plone server and are never exposed to anonymous site visitors
- **Plone Add-on Profiles:** Includes GenericSetup `default` and `uninstall` profiles and `plone.autoinclude.plugin` / `z3c.autoinclude.plugin` entry points

---

## Installation

### Local / Development (`yc1` / `yc19` Plone Backend)

Place the package in `backend/src/volto.formsupport.dataexport` and install it into the backend virtual environment:

```bash
cd backend
uv pip install -e src/volto.formsupport.dataexport
```

Or using `pip`:

```bash
source .venv/bin/activate
pip install -e src/volto.formsupport.dataexport
```

### Production (from Git)

```bash
cd /opt/backend
source bin/activate
pip install git+https://github.com/rnunez80/volto.formsupport.dataexport.git@main
```

### Buildout

```ini
[buildout]
eggs +=
    volto.formsupport.dataexport
```

---

## REST Endpoint Specification

### `POST <content-path>/@form-export-api`

**Request Body:**

```json
{
  "block_id": "<uuid of the form block>",
  "destination_id": "<uuid of the export destination>",
  "form_data": [
    { "field_id": "name", "value": "Jane Doe" },
    { "field_id": "email", "value": "jane@example.com" }
  ]
}
```

**Response Body:**

```json
{
  "status": "ok",
  "response_code": 200,
  "message": "{\"received\": true}"
}
```

---

## Running Tests

```bash
cd src/volto.formsupport.dataexport
python -m pytest src/volto/formsupport/dataexport/tests/ -v
```

---

## Changelog

See [CHANGES.rst](./CHANGES.rst) and [CHANGELOG.md](./CHANGELOG.md) for release history.
