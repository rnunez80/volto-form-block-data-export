/**
 * Actions for volto-form-block-data-export.
 * All external API calls are proxied through the Plone
 * `@form-export-api` REST endpoint — the browser never
 * contacts third-party URLs directly.
 */

export const EXPORT_TO_API = 'EXPORT_TO_API';
export const EXPORT_TO_API_SUCCESS = 'EXPORT_TO_API_SUCCESS';
export const EXPORT_TO_API_FAIL = 'EXPORT_TO_API_FAIL';

/**
 * Dispatch form data to one configured export destination via the
 * Plone proxy endpoint.
 *
 * @param {string} path         - Content path (same path used by @submit-form)
 * @param {string} block_id     - The form block's UUID
 * @param {string} destination_id - The destination's local id within export_destinations[]
 * @param {Array}  form_data    - The raw form_data array from the submit result
 */
export function exportToApi(path, block_id, destination_id, form_data) {
  return {
    type: EXPORT_TO_API,
    // Unique subrequest key so multiple destinations don't overwrite each other
    subrequest: `${block_id}__${destination_id}`,
    request: {
      op: 'post',
      path: `${path}/@form-export-api`,
      data: {
        block_id,
        destination_id,
        form_data: form_data || [],
      },
    },
  };
}
