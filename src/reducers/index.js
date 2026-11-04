/**
 * Reducer for volto-form-block-data-export.
 *
 * Tracks the state of each export request keyed by
 * `subrequest` (`${block_id}__${destination_id}`), mirroring
 * the same pattern used by volto-form-block's submitForm reducer.
 *
 * Shape:
 * {
 *   subrequests: {
 *     "<block_id>__<dest_id>": { loading, loaded, error, result }
 *   }
 * }
 */

import {
  EXPORT_TO_API,
  EXPORT_TO_API_SUCCESS,
  EXPORT_TO_API_FAIL,
} from '../actions/index.js';

const initialState = {
  subrequests: {},
};

const subRequestInitial = {
  loading: false,
  loaded: false,
  error: null,
  result: null,
};

export function exportToApi(state = initialState, action = {}) {
  const key = action.subrequest;

  switch (action.type) {
    case EXPORT_TO_API:
      return {
        ...state,
        subrequests: {
          ...state.subrequests,
          [key]: { ...subRequestInitial, loading: true },
        },
      };

    case EXPORT_TO_API_SUCCESS:
      return {
        ...state,
        subrequests: {
          ...state.subrequests,
          [key]: {
            loading: false,
            loaded: true,
            error: null,
            result: action.result,
          },
        },
      };

    case EXPORT_TO_API_FAIL:
      return {
        ...state,
        subrequests: {
          ...state.subrequests,
          [key]: {
            loading: false,
            loaded: false,
            error: action.error,
            result: null,
          },
        },
      };

    default:
      return state;
  }
}
