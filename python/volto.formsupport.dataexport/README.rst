============================
volto.formsupport.dataexport
============================

Standalone Plone REST API add-on providing the ``POST @form-export-api`` proxy endpoint for ``volto-form-block-data-export``.

Overview
--------

This package provides the ``POST @form-export-api`` Plone REST service.
When a user submits a form block in Volto with **Stream data** enabled, the frontend dispatches export requests through this endpoint. Plone reads the export destination configuration (target URL, HTTP method, custom headers, authentication credentials, and JSON payload template) from the form block data server-side and forwards the submission to the configured external API or webhook.

Features
--------

- **Server-proxied HTTP client** supporting ``POST``, ``PUT``, and ``PATCH``.
- **Authentication injection:** ``None``, ``Bearer`` token / API Key, or HTTP ``Basic`` auth (``username:password``).
- **Custom HTTP headers** per destination.
- **JSON payload template engine** with ``${field_id}`` variable substitution.
- **Submission metadata injection:** Optionally appends ``page_path``, ``destination_id``, and ``submitted_at`` ISO-8601 UTC timestamp.
- **Server-side secret isolation:** Auth tokens and API keys remain stored in Plone block data and are never exposed to anonymous browser visitors.
- **GenericSetup integration:** Includes ``default`` and ``uninstall`` profiles for Plone Site Setup -> Add-ons.

Requirements
------------

- Plone 6.0, 6.1, or 6.2+ (Python 3.8+)
- ``plone.restapi``
- ``volto-form-block-data-export`` Volto add-on (1.2.0 or later)

Installation
------------

Development (uv / pip in Plone backend)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Clone or place ``volto.formsupport.dataexport`` in ``backend/src/volto.formsupport.dataexport`` and install in editable mode:

.. code-block:: bash

    cd backend
    source .venv/bin/activate
    uv pip install -e src/volto.formsupport.dataexport

Or with standard ``pip``:

.. code-block:: bash

    pip install -e src/volto.formsupport.dataexport

Production (from Git)
~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

    source bin/activate
    pip install git+https://github.com/rnunez80/volto.formsupport.dataexport.git@main

Buildout
~~~~~~~~

Add ``volto.formsupport.dataexport`` to your ``buildout.cfg``:

.. code-block:: ini

    [buildout]
    ...
    eggs =
        volto.formsupport.dataexport

and run ``bin/buildout``.

Running Tests
-------------

.. code-block:: bash

    cd src/volto.formsupport.dataexport
    pytest

License
-------

The project is licensed under the MIT License.
