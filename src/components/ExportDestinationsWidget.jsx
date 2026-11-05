/**
 * ExportDestinationsWidget
 *
 * Volto sidebar widget for managing generic HTTP/API export destinations.
 * Built to align with Volto's UI standards, featuring full-width responsive
 * fields, explicit labels (including Headers and Schema), and high-contrast controls.
 */

import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  Accordion,
  Button,
  Checkbox,
  Input,
  Label,
  Segment,
  Select,
  TextArea,
} from 'semantic-ui-react';
import { Icon } from '@plone/volto/components';

import addSVG from '@plone/volto/icons/add.svg';
import deleteSVG from '@plone/volto/icons/delete.svg';
import copySVG from '@plone/volto/icons/copy.svg';
import upSVG from '@plone/volto/icons/up-key.svg';
import downSVG from '@plone/volto/icons/down-key.svg';
import showSVG from '@plone/volto/icons/show.svg';
import hideSVG from '@plone/volto/icons/hide.svg';
import serverSVG from '@plone/volto/icons/server.svg';

import './ExportDestinationsWidget.css';

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const METHOD_OPTIONS = [
  { key: 'POST', value: 'POST', text: 'POST' },
  { key: 'PUT', value: 'PUT', text: 'PUT' },
  { key: 'PATCH', value: 'PATCH', text: 'PATCH' },
];

const METHOD_COLORS = {
  POST: 'green',
  PUT: 'blue',
  PATCH: 'purple',
};

const AUTH_TYPE_OPTIONS = [
  { key: 'none', value: 'none', text: 'None' },
  { key: 'bearer', value: 'bearer', text: 'Bearer Token / API Key' },
  { key: 'basic', value: 'basic', text: 'Basic Auth (user:password)' },
];

const COMMON_HEADER_PRESETS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
  { key: 'X-API-Key', value: '' },
];

/* ------------------------------------------------------------------ */
/* KeyValueEditor — custom headers editor in Volto UI style           */
/* ------------------------------------------------------------------ */

function KeyValueEditor({ pairs, onChange }) {
  const handleChange = (index, field, value) => {
    const updated = pairs.map((p, i) =>
      i === index ? { ...p, [field]: value } : p,
    );
    onChange(updated);
  };

  const addPair = (presetKey = '', presetValue = '') => {
    onChange([...pairs, { key: presetKey, value: presetValue }]);
  };

  const removePair = (index) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <div className="dest-headers-editor">
      <div className="dest-header-presets">
        <span className="dest-preset-label">Presets:</span>
        {COMMON_HEADER_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="mini"
            basic
            compact
            className="dest-preset-chip"
            onClick={() => addPair(preset.key, preset.value)}
          >
            + {preset.key}
          </Button>
        ))}
      </div>

      {pairs.length > 0 ? (
        <div className="dest-header-rows">
          {pairs.map((pair, idx) => (
            <div key={idx} className="dest-header-row">
              <Input
                size="small"
                placeholder="Header Name"
                value={pair.key}
                onChange={(e) => handleChange(idx, 'key', e.target.value)}
                className="dest-header-input"
              />
              <Input
                size="small"
                placeholder="Value"
                value={pair.value}
                onChange={(e) => handleChange(idx, 'value', e.target.value)}
                className="dest-header-input"
              />
              <button
                type="button"
                className="delete-button"
                onClick={() => removePair(idx)}
                title="Remove header"
                aria-label="Remove header"
              >
                <Icon name={deleteSVG} size="16px" color="#e40166" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="dest-headers-empty">No custom headers configured.</p>
      )}

      <Button
        type="button"
        size="tiny"
        basic
        compact
        className="dest-add-header-btn"
        onClick={() => addPair()}
      >
        <Icon name={addSVG} size="14px" /> Add Custom Header
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExportDestinationsWidget                                           */
/* ------------------------------------------------------------------ */

function ExportDestinationsWidget({ value, onChange, id, formData }) {
  const destinations = Array.isArray(value) ? value : [];
  const [openIndex, setOpenIndex] = useState(
    destinations.length > 0 ? 0 : null,
  );
  const [showTokens, setShowTokens] = useState({});
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);
  const textareaRefs = useRef({});

  const subblocks = formData?.subblocks || [];

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
    setConfirmDeleteIndex(null);
  };

  const toggleShowToken = (index) => {
    setShowTokens((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAdd = () => {
    const newDest = {
      id: uuidv4(),
      label: '',
      enabled: true,
      url: '',
      method: 'POST',
      auth_type: 'none',
      auth_token: '',
      extra_headers: {},
      payload_template: '',
      include_metadata: false,
    };
    const updated = [...destinations, newDest];
    onChange(id, updated);
    setOpenIndex(updated.length - 1);
  };

  const handleDuplicate = (index) => {
    const source = destinations[index];
    if (!source) return;
    const duplicated = {
      ...source,
      id: uuidv4(),
      label: source.label ? `${source.label} (Copy)` : 'Copy of destination',
    };
    const updated = [
      ...destinations.slice(0, index + 1),
      duplicated,
      ...destinations.slice(index + 1),
    ];
    onChange(id, updated);
    setOpenIndex(index + 1);
  };

  const updateDestination = (index, field, val) => {
    const updated = destinations.map((d, i) =>
      i === index ? { ...d, [field]: val } : d,
    );
    onChange(id, updated);
  };

  const handleRemove = (index) => {
    const updated = destinations.filter((_, i) => i !== index);
    onChange(id, updated);
    setConfirmDeleteIndex(null);
    if (openIndex === index) {
      setOpenIndex(null);
    } else if (openIndex > index) {
      setOpenIndex(openIndex - 1);
    }
  };

  const insertFieldTag = (index, fieldId) => {
    const dest = destinations[index] || {};
    const tag = `"\${${fieldId}}"`;
    const textarea = textareaRefs.current[index];
    if (!textarea) {
      updateDestination(
        index,
        'payload_template',
        (dest.payload_template || '') + tag,
      );
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = dest.payload_template || '';
    const updated = current.substring(0, start) + tag + current.substring(end);
    updateDestination(index, 'payload_template', updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const formatPayload = (index) => {
    const dest = destinations[index] || {};
    try {
      const parsed = JSON.parse(dest.payload_template);
      updateDestination(
        index,
        'payload_template',
        JSON.stringify(parsed, null, 2),
      );
    } catch (e) {
      // invalid json, ignore
    }
  };

  return (
    <div className="export-destinations-widget">
      {destinations.length > 0 ? (
        <>
          <Accordion fluid styled className="form export-dest-accordion">
            {destinations.map((dest, index) => {
              const isOpen = openIndex === index;
              const isEnabled = dest.enabled !== false;
              const method = dest.method || 'POST';
              const showToken = !!showTokens[index];

              const isValidUrl =
                !dest.url ||
                dest.url.startsWith('http://') ||
                dest.url.startsWith('https://');

              let jsonValidation = { status: 'empty', message: '' };
              if (dest.payload_template && dest.payload_template.trim()) {
                try {
                  JSON.parse(dest.payload_template);
                  jsonValidation = { status: 'valid', message: 'Valid JSON' };
                } catch (err) {
                  jsonValidation = { status: 'invalid', message: err.message };
                }
              }

              const headerPairs = dest.extra_headers
                ? Object.entries(dest.extra_headers).map(([k, v]) => ({
                    key: k,
                    value: v,
                  }))
                : [];

              const onHeadersChange = (pairs) => {
                const obj = pairs.reduce((acc, { key, value }) => {
                  if (key && key.trim()) acc[key.trim()] = value;
                  return acc;
                }, {});
                updateDestination(index, 'extra_headers', obj);
              };

              return (
                <div
                  key={dest.id || index}
                  className={`export-dest-item ${
                    !isEnabled ? 'export-dest-item--disabled' : ''
                  }`}
                >
                  <Accordion.Title
                    active={isOpen}
                    index={index}
                    onClick={() => handleToggle(index)}
                    className="export-dest-title"
                  >
                    <div className="accordion-title-wrapper">
                      <Label
                        size="mini"
                        color={METHOD_COLORS[method] || 'grey'}
                        className="dest-method-badge"
                      >
                        {method}
                      </Label>
                      <span className="dest-title-label">
                        {dest.label || `Destination #${index + 1}`}
                        {!isEnabled && (
                          <span className="dest-title-paused"> (Paused)</span>
                        )}
                      </span>
                      {dest.url && (
                        <span className="dest-title-url" title={dest.url}>
                          {dest.url}
                        </span>
                      )}
                    </div>
                    <div
                      className="accordion-tools"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        toggle
                        checked={isEnabled}
                        onChange={(e, { checked }) =>
                          updateDestination(index, 'enabled', checked)
                        }
                        title={
                          isEnabled
                            ? 'Destination is active'
                            : 'Destination is paused'
                        }
                        aria-label="Toggle active status"
                      />
                      <button
                        type="button"
                        className="copy-button"
                        aria-label={`Duplicate destination #${index + 1}`}
                        onClick={() => handleDuplicate(index)}
                        title="Duplicate"
                      >
                        <Icon name={copySVG} size="18px" />
                      </button>
                      {confirmDeleteIndex === index ? (
                        <span className="dest-delete-confirm-group">
                          <button
                            type="button"
                            className="dest-delete-confirm-btn"
                            onClick={() => handleRemove(index)}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="dest-delete-cancel-btn"
                            onClick={() => setConfirmDeleteIndex(null)}
                          >
                            ✕
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="delete-button"
                          aria-label={`Remove destination #${index + 1}`}
                          onClick={() => setConfirmDeleteIndex(index)}
                          title="Delete"
                        >
                          <Icon name={deleteSVG} size="18px" color="#e40166" />
                        </button>
                      )}
                      {isOpen ? (
                        <Icon name={upSVG} size="20px" />
                      ) : (
                        <Icon name={downSVG} size="20px" />
                      )}
                    </div>
                  </Accordion.Title>

                  <Accordion.Content active={isOpen}>
                    <Segment className="export-dest-fields">
                      {/* Destination Label */}
                      <div className="field dest-field">
                        <label
                          htmlFor={`field-dest-${index}-label`}
                          className="dest-field-label"
                        >
                          Destination Label
                        </label>
                        <Input
                          fluid
                          id={`field-dest-${index}-label`}
                          name={`dest-${index}-label`}
                          value={dest.label || ''}
                          placeholder="e.g. CRM Webhook, Zapier Lead Capture"
                          onChange={(e) =>
                            updateDestination(index, 'label', e.target.value)
                          }
                        />
                        <p className="help">
                          Identify this webhook or API target (e.g. CRM, Zapier,
                          Webhook)
                        </p>
                      </div>

                      {/* Endpoint URL */}
                      <div className="field dest-field">
                        <label
                          htmlFor={`field-dest-${index}-url`}
                          className="dest-field-label"
                        >
                          Endpoint URL <span className="dest-required">*</span>
                        </label>
                        <Input
                          fluid
                          id={`field-dest-${index}-url`}
                          name={`dest-${index}-url`}
                          value={dest.url || ''}
                          placeholder="https://api.example.com/v1/webhook"
                          error={!isValidUrl}
                          onChange={(e) =>
                            updateDestination(index, 'url', e.target.value)
                          }
                        />
                        {!isValidUrl && (
                          <div className="ui pointing red basic label">
                            URL must start with http:// or https://
                          </div>
                        )}
                        <p className="help">
                          Server-proxied destination for form submission
                          payloads
                        </p>
                      </div>

                      {/* HTTP Method */}
                      <div className="field dest-field">
                        <label
                          htmlFor={`field-dest-${index}-method`}
                          className="dest-field-label"
                        >
                          HTTP Method
                        </label>
                        <Select
                          fluid
                          id={`field-dest-${index}-method`}
                          value={dest.method || 'POST'}
                          options={METHOD_OPTIONS}
                          onChange={(e, { value }) =>
                            updateDestination(index, 'method', value)
                          }
                        />
                        <p className="help">
                          HTTP verb used when dispatching form data
                        </p>
                      </div>

                      {/* Authentication */}
                      <div className="field dest-field">
                        <label
                          htmlFor={`field-dest-${index}-auth_type`}
                          className="dest-field-label"
                        >
                          Authentication
                        </label>
                        <Select
                          fluid
                          id={`field-dest-${index}-auth_type`}
                          value={dest.auth_type || 'none'}
                          options={AUTH_TYPE_OPTIONS}
                          onChange={(e, { value }) =>
                            updateDestination(index, 'auth_type', value)
                          }
                        />
                        <p className="help">
                          Authentication mechanism required by the external API
                        </p>
                      </div>

                      {/* Auth Token / Credentials (conditional) */}
                      {dest.auth_type && dest.auth_type !== 'none' && (
                        <div className="field dest-field">
                          <label
                            htmlFor={`field-dest-${index}-auth_token`}
                            className="dest-field-label"
                          >
                            {dest.auth_type === 'bearer'
                              ? 'Bearer Token / API Key'
                              : 'Credentials (user:password)'}
                          </label>
                          <Input
                            fluid
                            id={`field-dest-${index}-auth_token`}
                            type={showToken ? 'text' : 'password'}
                            value={dest.auth_token || ''}
                            placeholder={
                              dest.auth_type === 'bearer'
                                ? 'eyJhbGciOi... or api_key_123'
                                : 'username:password'
                            }
                            onChange={(e) =>
                              updateDestination(
                                index,
                                'auth_token',
                                e.target.value,
                              )
                            }
                            icon={
                              <Icon
                                name={showToken ? hideSVG : showSVG}
                                size="18px"
                                className="link"
                                onClick={() => toggleShowToken(index)}
                                title={showToken ? 'Hide token' : 'Show token'}
                              />
                            }
                          />
                          <p className="help">
                            Stored securely server-side on Plone; never exposed
                            to browser visitors.
                          </p>
                        </div>
                      )}

                      {/* Headers */}
                      <div className="field dest-field">
                        <label className="dest-field-label">Headers</label>
                        <KeyValueEditor
                          pairs={headerPairs}
                          onChange={onHeadersChange}
                        />
                        <p className="help">
                          Optional HTTP headers to send with each request (e.g.
                          X-API-Key, Accept)
                        </p>
                      </div>

                      {/* Payload Schema (JSON) */}
                      <div className="field dest-field">
                        <div className="dest-field-header-row">
                          <label
                            htmlFor={`field-dest-${index}-payload`}
                            className="dest-field-label"
                          >
                            Schema (JSON Payload Template)
                          </label>
                          <div className="dest-payload-toolbar">
                            {jsonValidation.status === 'valid' && (
                              <Label size="mini" color="green">
                                ✓ Valid JSON
                              </Label>
                            )}
                            {jsonValidation.status === 'invalid' && (
                              <Label
                                size="mini"
                                color="red"
                                title={jsonValidation.message}
                              >
                                ⚠ Syntax Error
                              </Label>
                            )}
                            {dest.payload_template ? (
                              <Button
                                size="mini"
                                basic
                                compact
                                type="button"
                                onClick={() => formatPayload(index)}
                              >
                                Format JSON
                              </Button>
                            ) : (
                              <Button
                                size="mini"
                                basic
                                compact
                                type="button"
                                onClick={() => {
                                  const example =
                                    subblocks && subblocks.length > 0
                                      ? JSON.stringify(
                                          subblocks.reduce((acc, s) => {
                                            const k = s.label
                                              ? s.label
                                                  .toLowerCase()
                                                  .replace(/[^a-zA-Z0-9]/g, '_')
                                              : s.id;
                                            acc[k] = `\${${k}}`;
                                            return acc;
                                          }, {}),
                                          null,
                                          2,
                                        )
                                      : '{\n  "lead_name": "${name}",\n  "lead_email": "${email}"\n}';
                                  updateDestination(
                                    index,
                                    'payload_template',
                                    example,
                                  );
                                }}
                              >
                                Insert Example
                              </Button>
                            )}
                          </div>
                        </div>

                        {subblocks && subblocks.length > 0 && (
                          <div className="dest-token-bar">
                            <span className="dest-token-bar__label">
                              Insert field:
                            </span>
                            <div className="dest-token-bar__chips">
                              {subblocks.map((s, sIdx) => {
                                const fid =
                                  s.field_id ||
                                  (s.label
                                    ? s.label
                                        .toLowerCase()
                                        .replace(/[^a-zA-Z0-9]/g, '_')
                                    : s.id) ||
                                  `field_${sIdx}`;
                                const flabel = s.label || s.field_name || fid;
                                return (
                                  <Button
                                    key={fid}
                                    size="mini"
                                    basic
                                    compact
                                    type="button"
                                    className="dest-token-chip"
                                    onClick={() => insertFieldTag(index, fid)}
                                    title={`Insert \${${fid}}`}
                                  >
                                    + {flabel}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <TextArea
                          id={`field-dest-${index}-payload`}
                          ref={(el) => {
                            textareaRefs.current[index] = el;
                          }}
                          rows={6}
                          value={dest.payload_template || ''}
                          placeholder={
                            'Leave blank to automatically send all form fields, or enter custom JSON template:\n{\n  "lead_name": "${name}",\n  "lead_email": "${email}"\n}'
                          }
                          onChange={(e) =>
                            updateDestination(
                              index,
                              'payload_template',
                              e.target.value,
                            )
                          }
                          className="dest-code-textarea"
                          spellCheck={false}
                        />
                        <p className="help">
                          Use <code>{'${field_id}'}</code> to inject form values
                          into your custom payload structure. Leave blank to
                          automatically send the complete form submission
                          object.
                        </p>
                      </div>

                      {/* Include Submission Metadata */}
                      <div className="field dest-field dest-field--toggle">
                        <label className="dest-field-label">Metadata</label>
                        <Checkbox
                          id={`field-dest-${index}-include_metadata`}
                          toggle
                          checked={dest.include_metadata === true}
                          onChange={(e, { checked }) =>
                            updateDestination(
                              index,
                              'include_metadata',
                              checked,
                            )
                          }
                          label="Include Submission Metadata"
                        />
                        <p className="help">
                          Appends context fields to the payload: path, block_id,
                          and submitted_at.
                        </p>
                      </div>
                    </Segment>
                  </Accordion.Content>
                </div>
              );
            })}
          </Accordion>

          <div className="dest-add-wrapper">
            <Button
              compact
              primary
              className="dest-add-btn"
              onClick={handleAdd}
            >
              <Icon name={addSVG} size="18px" />
              <span>Add Export Destination</span>
            </Button>
          </div>
        </>
      ) : (
        <Segment
          placeholder
          textAlign="center"
          className="dest-empty-placeholder"
        >
          <div className="dest-empty-icon">
            <Icon name={serverSVG} size="36px" />
          </div>
          <h4>No Export Destinations</h4>
          <p className="help">
            Stream form submissions in real-time to external APIs or webhooks
            via the Plone server proxy.
          </p>
          <div className="dest-add-wrapper">
            <Button
              compact
              primary
              className="dest-add-btn"
              onClick={handleAdd}
            >
              <Icon name={addSVG} size="18px" />
              <span>Add Export Destination</span>
            </Button>
          </div>
        </Segment>
      )}
    </div>
  );
}

ExportDestinationsWidget.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  formData: PropTypes.object,
};

ExportDestinationsWidget.defaultProps = {
  value: [],
};

export default ExportDestinationsWidget;
