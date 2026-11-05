# volto-form-block-data-export

**Version:** 1.2.1

A Volto addon that extends [volto-form-block](https://github.com/collective/volto-form-block) with a **server-proxied generic API export pipeline**.

After each successful form submission, form data is forwarded to one or more configured external API endpoints **via the Plone server** (`volto.formsupport.dataexport`) — the browser never contacts third-party URLs directly, giving you control over CORS, authentication, and logging.

---

## Features

- **"Stream data" sidebar toggle** — integrated into the form block's **Manage data** panel alongside email and local database storage.
- **Multiple destinations per form** — add as many export targets as needed.
- **Flexible auth** — `None`, `Bearer` token / API key, or HTTP `Basic` (`user:password`).
- **Custom headers** — forward any additional HTTP headers with quick presets.
- **Payload templates** — map form fields to any JSON structure using `${field_id}` placeholders, with one-click field token insertion and live JSON syntax validation.
- **Metadata injection** — optionally include page path, destination ID, and submission timestamp.
- **Enable/disable per destination** — toggle without deleting configuration.
- **All secrets server-side** — auth tokens live in Plone block data, never in the browser.

---

## Architecture

```text
Browser → @submit-form (existing, volto-form-block)
                │ success
                ▼
         Redux middleware (volto-form-block-data-export)
                │ for each enabled destination
                ▼
         POST <path>/@form-export-api   (Plone, volto.formsupport.dataexport)
                │
                ▼
         External API  (your CRM, database, webhook, etc.)
```

---

## Requirements

- **Plone Backend:** Plone 6.0, 6.1, or 6.2+ with [`volto.formsupport.dataexport`](./python/volto.formsupport.dataexport) (`>= 1.2.0`) installed.
- **Volto Frontend:** `@plone/volto` 16, 17, 18, or 19 and `volto-form-block` (`>= 3.18`).

---

## Installation

### 1. Volto Frontend Add-on (`volto-form-block-data-export`)

#### Volto 18 / Volto 19 (`pnpm` workspaces)

1. Place this addon in `packages/volto-form-block-data-export`.
2. Add to your project's `package.json`:

```json
"dependencies": {
  "volto-form-block": "workspace:*",
  "volto-form-block-data-export": "workspace:*"
}
```

3. Register in `volto.config.js`:

```js
const addons = [
  'volto-form-block',
  'volto-form-block-data-export',
];
```

4. Run `pnpm install`.

#### Volto 16 / Volto 17 (`yarn` workspaces)

1. Place this addon in `src/addons/volto-form-block-data-export`.
2. Add to your project's root `package.json`:

```json
"addons": [
  "volto-form-block",
  "volto-form-block-data-export"
],
"dependencies": {
  "volto-form-block-data-export": "*"
}
```

3. Run `yarn install`.

### 2. Standalone Plone Backend Add-on (`volto.formsupport.dataexport`)

#### Local / Development (`backend/src/volto.formsupport.dataexport`)

Place `volto.formsupport.dataexport` in `backend/src/volto.formsupport.dataexport` and install it into your Plone backend virtual environment:

```bash
cd backend
uv pip install -e src/volto.formsupport.dataexport
```

Or with `pip`:

```bash
source .venv/bin/activate
pip install -e src/volto.formsupport.dataexport
```

#### Production (from Git)

```bash
cd /opt/backend
source bin/activate
pip install git+https://github.com/rnunez80/volto.formsupport.dataexport.git@main
```

`volto.formsupport.dataexport` registers both `z3c.autoinclude.plugin` and `plone.autoinclude.plugin` entry points so its ZCML and GenericSetup profile are automatically loaded by Plone.

---

## Usage

1. Add a **Form** block to any Plone page.
2. In the block editor sidebar under **"Manage data"**, enable **"Stream data"**.
3. Click **"+ Add Export Destination"** to add an API endpoint.
4. Fill in the target URL, select the HTTP method (`POST`, `PUT`, or `PATCH`), choose authentication (`None`, `Bearer Token`, or `Basic Auth`), and optionally specify custom headers and a JSON payload template.
5. Save the page and submit the form — data will be streamed to the configured destinations via the Plone backend automatically.

### Payload Template Example

To map specific fields instead of sending the full form array:

```json
{
  "contact_name": "${name}",
  "contact_email": "${email}",
  "inquiry": "${message}"
}
```

Field IDs use the same `field_id` values shown in the form block's field configuration.

---

## Running Tests

### Frontend Tests

```bash
npm test
```

### Python Backend Tests

```bash
cd python/volto.formsupport.dataexport
python -m pytest src/volto/formsupport/dataexport/tests/ -v
```

---

## Security Notes

- Auth tokens (`auth_token`) are stored in the Plone content object's block data. They are **only accessible to users with edit permissions** on the content item and are **never returned** to anonymous site visitors by the Plone REST API.
- The proxy endpoint runs under Plone's request lifecycle, so standard Plone security applies.
- Outbound HTTP requests from Plone have a 15-second timeout to prevent form submissions from hanging.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full release notes.
