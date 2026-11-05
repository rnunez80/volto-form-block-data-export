# Changelog

All notable changes to `volto-form-block-data-export` will be documented in this file.

## [1.2.1] - 2026-11-05

### Bug Fixes & UI Improvements

- **Redux Middleware Prepending:** Fixed Redux middleware stack registration in `exportStackExtender` by prepending `exportMiddleware` to the store middleware stack. Previously, appending it caused Volto core's `api` middleware to intercept and consume `SUBMIT_FORM_ACTION` before reaching `exportMiddleware`, causing `pendingSubmissions` to be empty and resulting in blank `form_data: []` payloads dispatched to the backend proxy.
- **Payload Template Example Generator:** Added an "Insert Example" button in `ExportDestinationsWidget` when `payload_template` is empty, automatically generating a valid JSON template matching the form's actual subblocks.
- **Clarified Placeholder:** Updated `payload_template` textarea placeholder to explicitly state that leaving it blank sends the complete form submission object, preventing confusion between empty fields and saved templates.
- **Field Token Insertion:** Updated field token chips in `ExportDestinationsWidget` to insert normalized field names (e.g., `${name}`) rather than raw internal UUIDs.

---

## [1.2.0] - 2026-10-27

### Features & Packaging

- **Standalone Plone Add-on:** Packaged `volto.formsupport.dataexport` as a standalone Plone backend add-on using the standard `src/volto/formsupport/dataexport` layout.
- **GenericSetup Profiles & Browser Layer:** Added `default` and `uninstall` GenericSetup profiles, `IVoltoFormsupportDataexportLayer` browser layer, `setuphandlers.py`, and `permissions.zcml` so the add-on can be managed in Plone's Add-ons control panel.
- **Plone 6.0 / 6.1 / 6.2 Autoinclude:** Registered both `z3c.autoinclude.plugin` and `plone.autoinclude.plugin` entry points in `setup.py`.
- **Documentation:** Updated `README.rst`, `README.md`, and `CHANGES.rst` with standalone installation and usage instructions.

---

## [1.1.0] - 2026-10-20

### Features

- Aligned server-proxied export pipeline with `volto-form-block-data-export` 1.1.0 "Stream data" toggle and submission metadata payload options.

---

## [1.0.0] - 2026-10-18

### Initial Release

- Initial release of `POST @form-export-api` Plone REST API service.
- Generic HTTP proxy supporting `POST`, `PUT`, and `PATCH` methods.
- Support for Bearer token and HTTP Basic authentication, custom HTTP headers, `${field_id}` JSON payload template rendering, and submission metadata injection.
