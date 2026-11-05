Changelog
=========

1.2.1 (2026-11-05)
------------------

- Enhanced payload template substitution in ``POST @form-export-api`` to index form fields by UUID, field_id, label, lowercase label, and snake_case label, allowing templates using ``${name}`` or ``${email}`` to resolve correctly.
- Updated placeholder regex to ``r"\$\{([\w\-]+)\}"`` so internal UUIDs with hyphens are matched and substituted.
- Added safe JSON string escaping for substituted template values so quotes, backslashes, and multiline values preserve valid JSON without triggering ``JSONDecodeError``.


1.2.0 (2026-10-27)
------------------

- Extracted ``volto.formsupport.dataexport`` into a standalone Plone add-on with ``src/volto/formsupport/dataexport`` package layout.
- Added GenericSetup ``default`` and ``uninstall`` profiles, ``IVoltoFormsupportDataexportLayer`` browser layer, ``setuphandlers.py``, and ``permissions.zcml`` for Plone Add-ons control panel integration.
- Added ``setup.py``, ``MANIFEST.in``, ``CHANGES.rst``, ``CONTRIBUTORS.rst``, and ``plone.autoinclude.plugin`` / ``z3c.autoinclude.plugin`` entry points for Plone 6.0, 6.1, and 6.2 compatibility.
- Updated documentation and installation instructions for standalone Plone backend deployment.


1.1.0 (2026-10-20)
------------------

- Aligned server-proxied export pipeline with ``volto-form-block-data-export`` 1.1.0 "Stream data" toggle and submission metadata payload options.


1.0.0 (2026-10-18)
------------------

- Initial release with ``POST @form-export-api`` Plone REST API service.
- Added generic HTTP proxy supporting ``POST``, ``PUT``, and ``PATCH`` methods.
- Added support for Bearer token and HTTP Basic authentication, custom HTTP headers, ``${field_id}`` JSON payload template rendering, and submission metadata injection.
