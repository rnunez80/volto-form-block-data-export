/**
 * Redux middleware for volto-form-block-data-export.
 *
 * Intercepts SUBMIT_FORM_ACTION_SUCCESS fired by volto-form-block
 * after a successful form submission and dispatches an exportToApi
 * action for every enabled destination configured on the form block.
 *
 * The actual HTTP call to the external API is handled server-side by
 * the Plone `@form-export-api` REST endpoint — this middleware only
 * triggers the Volto action that reaches that endpoint.
 *
 * Registration (in config.settings.storeExtenders):
 *   Volto's storeExtenders pattern passes each extender the current
 *   middleware stack (array) and expects a new array back:
 *     stack = extenders.reduce((acc, fn) => fn(acc), stack)
 *   So exportStackExtender receives the array and appends the middleware.
 */

import { exportToApi } from '../actions/index.js';

// Action types from volto-form-block
const SUBMIT_FORM_ACTION = 'SUBMIT_FORM_ACTION';
const SUBMIT_FORM_SUCCESS = 'SUBMIT_FORM_ACTION_SUCCESS';
const SUBMIT_FORM_FAIL = 'SUBMIT_FORM_ACTION_FAIL';

// Map of in-flight form submissions: blockId -> { path, formData }
const pendingSubmissions = new Map();
// Set of blockIds currently processed to prevent duplicate export dispatches
const alreadyHandled = new Set();

/**
 * Walk Redux content state to find the block data for a given block_id.
 * Recursively inspects nested container blocks (e.g. columns, subblocks).
 *
 * @param {Object} state  - Full Redux state
 * @param {string} blockId - The form block UUID (= action.subrequest)
 * @returns {Object|null} The block's data object or null
 */
function findBlockData(state, blockId) {
  if (!state || !blockId) return null;
  const candidates = [
    state.content?.data?.blocks,
    state.content?.shadowContent?.blocks,
    state.form?.data?.blocks,
  ].filter(Boolean);

  function search(blocksObj) {
    if (!blocksObj || typeof blocksObj !== 'object') return null;
    if (blocksObj[blockId]) return blocksObj[blockId];

    for (const key of Object.keys(blocksObj)) {
      const val = blocksObj[key];
      if (val && typeof val === 'object') {
        if (val.data?.blocks) {
          const found = search(val.data.blocks);
          if (found) return found;
        }
        if (val.blocks) {
          const found = search(val.blocks);
          if (found) return found;
        }
      }
    }
    return null;
  }

  for (const blocks of candidates) {
    const found = search(blocks);
    if (found) return found;
  }
  return null;
}

/**
 * Redux middleware (curried: middlewareAPI => next => action).
 *
 * Do NOT register this directly in storeExtenders — use
 * exportStackExtender below instead.
 */
export const exportMiddleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    // 1. Capture payload and path when the form submit action is initiated
    if (action.type === SUBMIT_FORM_ACTION) {
      const blockId = action.subrequest || action.request?.data?.block_id;
      const requestPath = action.request?.path || '';
      const path = requestPath.replace(/\/@submit-form$/, '');
      const rawData =
        action.request?.data?.data || action.request?.data?.formData || [];
      const formData = Array.isArray(rawData) ? rawData : [];

      if (blockId) {
        pendingSubmissions.set(blockId, { path, formData });
      }

      // Forward action downstream (reaches Volto's api middleware)
      const result = next(action);

      // Volto's api middleware returns a Promise (actionPromise) for async requests.
      // In real Volto runtime, api middleware dispatches SUBMIT_FORM_ACTION_SUCCESS
      // downstream only via next() and resolves actionPromise. By listening to the
      // returned promise, we guarantee exports are dispatched with the captured formData.
      if (result && typeof result.then === 'function') {
        result
          .then((actionResult) => {
            if (blockId && !alreadyHandled.has(blockId)) {
              alreadyHandled.add(blockId);
              setTimeout(() => alreadyHandled.delete(blockId), 5000);

              const pending =
                pendingSubmissions.get(blockId) || { path, formData };
              pendingSubmissions.delete(blockId);

              const state = getState();
              const currentPath =
                state.router?.location?.pathname?.replace(/\/$/, '') || '';
              const targetPath =
                pending.path || actionResult?.path || currentPath;
              const targetData = pending.formData || [];

              const blockData = findBlockData(state, blockId);
              const destinations = blockData?.export_destinations || [];

              destinations
                .filter((dest) => dest && dest.id && dest.enabled !== false)
                .forEach((dest) => {
                  dispatch(
                    exportToApi(targetPath, blockId, dest.id, targetData),
                  );
                });
            }
          })
          .catch(() => {
            if (blockId) {
              pendingSubmissions.delete(blockId);
              alreadyHandled.delete(blockId);
            }
          });
      }

      return result;
    }

    // 2. Clean up on failure
    if (action.type === SUBMIT_FORM_FAIL) {
      const blockId = action.subrequest || action.request?.data?.block_id;
      if (blockId) {
        pendingSubmissions.delete(blockId);
        alreadyHandled.delete(blockId);
      }
    }

    // Pass action through the rest of the middleware chain
    const result = next(action);

    // 3. Fallback for environments where api middleware does not return a Promise
    // (e.g. unit tests or synchronous mock stores)
    if (action.type === SUBMIT_FORM_SUCCESS) {
      const blockId = action.subrequest;
      if (blockId && !alreadyHandled.has(blockId)) {
        alreadyHandled.add(blockId);
        setTimeout(() => alreadyHandled.delete(blockId), 5000);

        const pending = pendingSubmissions.get(blockId);
        if (blockId) {
          pendingSubmissions.delete(blockId);
        }

        const state = getState();
        const currentPath =
          state.router?.location?.pathname?.replace(/\/$/, '') || '';
        const path = pending?.path ?? action.result?.path ?? currentPath;
        const formData = pending?.formData ?? action.result?.form_data ?? [];

        const blockData = findBlockData(state, blockId);
        const destinations = blockData?.export_destinations || [];

        destinations
          .filter((dest) => dest && dest.id && dest.enabled !== false)
          .forEach((dest) => {
            dispatch(exportToApi(path, blockId, dest.id, formData));
          });
      }
    }

    return result;
  };

/**
 * Stack extender for config.settings.storeExtenders.
 *
 * Volto's storeExtenders API passes each extender the current middleware
 * stack (an array) and expects a new array in return:
 *   stack = extenders.reduce((acc, fn) => fn(acc), stack)
 *
 * Register with:
 *   config.settings.storeExtenders = [
 *     ...(config.settings.storeExtenders || []),
 *     exportStackExtender,
 *   ];
 */
export function exportStackExtender(stackOrEnhancer) {
  if (Array.isArray(stackOrEnhancer)) {
    // Prepend exportMiddleware so it executes BEFORE Volto's api middleware.
    // Volto's api middleware intercepts actions with `action.request` and converts
    // them to `_PENDING`, stripping `request`. By placing exportMiddleware at the
    // start of the stack, it intercepts SUBMIT_FORM_ACTION and saves the payload
    // before api middleware handles it.
    return [exportMiddleware, ...stackOrEnhancer];
  }
  if (typeof stackOrEnhancer === 'function') {
    // Redux store enhancer compatibility (e.g. unit tests)
    return (reducer, preloadedState) => {
      const store = stackOrEnhancer(reducer, preloadedState);
      let dispatch = store.dispatch;
      const middlewareAPI = {
        getState: store.getState,
        dispatch: (action, ...args) => dispatch(action, ...args),
      };
      dispatch = exportMiddleware(middlewareAPI)(store.dispatch);
      return {
        ...store,
        dispatch,
      };
    };
  }
  return [exportMiddleware, ...(stackOrEnhancer || [])];
}

// Keep the old export name so index.js doesn't need updating
export { exportStackExtender as exportMiddlewareEnhancer };
