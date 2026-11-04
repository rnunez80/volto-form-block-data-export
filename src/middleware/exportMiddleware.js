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

/**
 * Walk Redux content state to find the block data for a given block_id.
 * Recursively inspects nested container blocks (e.g. columns, subblocks).
 *
 * @param {Object} state  - Full Redux state
 * @param {string} blockId - The form block UUID (= action.subrequest)
 * @returns {Object|null} The block's data object or null
 */
function findBlockData(state, blockId) {
  const rootBlocks =
    state.content?.data?.blocks ||
    state.content?.shadowContent?.blocks ||
    {};

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

  return search(rootBlocks);
}

/**
 * Redux middleware (curried: middlewareAPI => next => action).
 *
 * Do NOT register this directly in storeExtenders — use
 * exportStackExtender below instead.
 */
export const exportMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  // 1. Capture payload and path when the form submit action is initiated
  if (action.type === SUBMIT_FORM_ACTION) {
    const blockId = action.subrequest;
    const requestPath = action.request?.path || '';
    const path = requestPath.replace(/\/@submit-form$/, '');
    const formData = action.request?.data?.data || [];
    if (blockId) {
      pendingSubmissions.set(blockId, { path, formData });
    }
  }

  // 2. Clean up on failure
  if (action.type === SUBMIT_FORM_FAIL) {
    if (action.subrequest) {
      pendingSubmissions.delete(action.subrequest);
    }
  }

  // Pass action through the rest of the middleware chain
  const result = next(action);

  // 3. Dispatch exports after successful form submission
  if (action.type === SUBMIT_FORM_SUCCESS) {
    const blockId = action.subrequest;
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
    return [...stackOrEnhancer, exportMiddleware];
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
  return [...(stackOrEnhancer || []), exportMiddleware];
}

// Keep the old export name so index.js doesn't need updating
export { exportStackExtender as exportMiddlewareEnhancer };
