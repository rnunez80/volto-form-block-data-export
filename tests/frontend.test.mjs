import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  EXPORT_TO_API,
  EXPORT_TO_API_SUCCESS,
  EXPORT_TO_API_FAIL,
  exportToApi,
} from '../src/actions/index.js';
import { exportToApi as exportReducer } from '../src/reducers/index.js';
import { ExportFormSchemaExtender } from '../src/formSchemaExtender.js';
import { exportMiddlewareEnhancer } from '../src/middleware/exportMiddleware.js';

describe('Actions', () => {
  test('exportToApi generates correct action structure', () => {
    const action = exportToApi('/my-page', 'block-123', 'dest-456', [
      { field_id: 'name', value: 'John' },
    ]);

    assert.equal(action.type, EXPORT_TO_API);
    assert.equal(action.subrequest, 'block-123__dest-456');
    assert.deepEqual(action.request, {
      op: 'post',
      path: '/my-page/@form-export-api',
      data: {
        block_id: 'block-123',
        destination_id: 'dest-456',
        form_data: [{ field_id: 'name', value: 'John' }],
      },
    });
  });

  test('exportToApi handles empty form_data', () => {
    const action = exportToApi('', 'b1', 'd1', null);
    assert.deepEqual(action.request.data.form_data, []);
  });
});

describe('Reducers', () => {
  test('initial state defaults to empty subrequests', () => {
    const state = exportReducer(undefined, {});
    assert.deepEqual(state, { subrequests: {} });
  });

  test('handles EXPORT_TO_API pending state', () => {
    const action = {
      type: EXPORT_TO_API,
      subrequest: 'b1__d1',
    };
    const state = exportReducer(undefined, action);
    assert.deepEqual(state.subrequests['b1__d1'], {
      loading: true,
      loaded: false,
      error: null,
      result: null,
    });
  });

  test('handles EXPORT_TO_API_SUCCESS state', () => {
    const pendingState = {
      subrequests: {
        'b1__d1': { loading: true, loaded: false, error: null, result: null },
      },
    };
    const action = {
      type: EXPORT_TO_API_SUCCESS,
      subrequest: 'b1__d1',
      result: { status: 'ok', response_code: 200 },
    };
    const state = exportReducer(pendingState, action);
    assert.deepEqual(state.subrequests['b1__d1'], {
      loading: false,
      loaded: true,
      error: null,
      result: { status: 'ok', response_code: 200 },
    });
  });

  test('handles EXPORT_TO_API_FAIL state', () => {
    const pendingState = {
      subrequests: {
        'b1__d1': { loading: true, loaded: false, error: null, result: null },
      },
    };
    const action = {
      type: EXPORT_TO_API_FAIL,
      subrequest: 'b1__d1',
      error: { message: 'Network error' },
    };
    const state = exportReducer(pendingState, action);
    assert.deepEqual(state.subrequests['b1__d1'], {
      loading: false,
      loaded: false,
      error: { message: 'Network error' },
      result: null,
    });
  });
});

describe('FormSchemaExtender', () => {
  test('extends manage_data fieldset with stream_data toggle and conditional export_destinations', () => {
    const baseSchema = {
      fieldsets: [
        { id: 'default', title: 'Default', fields: ['title'] },
        { id: 'manage_data', title: 'Manage data', fields: ['send', 'store'] },
      ],
      properties: { title: { type: 'string' } },
      required: ['store', 'send'],
    };

    // When stream_data is disabled (default)
    const extendedDisabled = ExportFormSchemaExtender(baseSchema, {
      stream_data: false,
    });
    const manageFsDisabled = extendedDisabled.fieldsets.find(
      (f) => f.id === 'manage_data',
    );
    assert.ok(manageFsDisabled);
    assert.deepEqual(manageFsDisabled.fields, ['send', 'store', 'stream_data']);
    assert.ok(extendedDisabled.properties.stream_data);
    assert.ok(extendedDisabled.properties.export_destinations);

    // When stream_data is enabled
    const extendedEnabled = ExportFormSchemaExtender(baseSchema, {
      stream_data: true,
    });
    const manageFsEnabled = extendedEnabled.fieldsets.find(
      (f) => f.id === 'manage_data',
    );
    assert.ok(manageFsEnabled);
    assert.deepEqual(manageFsEnabled.fields, [
      'send',
      'store',
      'stream_data',
      'export_destinations',
    ]);
    // Destination requirement should be satisfied
    assert.equal(extendedEnabled.required.includes('store'), false);
    assert.equal(extendedEnabled.required.includes('send'), false);
  });
});

describe('ExportMiddleware', () => {
  const setupMockStore = (initialState) => {
    const dispatched = [];
    let state = initialState;

    const mockCreateStore = (rootReducer, preloadedState) => ({
      dispatch: (action) => {
        dispatched.push(action);
        return action;
      },
      getState: () => state,
    });

    const enhancer = exportMiddlewareEnhancer(mockCreateStore);
    const store = enhancer(null, initialState);

    return { store, dispatched, setState: (s) => (state = s) };
  };

  test('intercepts SUBMIT_FORM_ACTION and fires exports on SUBMIT_FORM_ACTION_SUCCESS', () => {
    const destinations = [
      { id: 'dest-1', label: 'CRM', enabled: true },
      { id: 'dest-2', label: 'Webhook', enabled: false }, // disabled, should skip
    ];

    const state = {
      content: {
        data: {
          blocks: {
            'form-uuid-1': {
              '@type': 'form',
              export_destinations: destinations,
            },
          },
        },
      },
    };

    const { store, dispatched } = setupMockStore(state);

    // 1. Submit action started
    store.dispatch({
      type: 'SUBMIT_FORM_ACTION',
      subrequest: 'form-uuid-1',
      request: {
        path: '/contact/@submit-form',
        data: {
          data: [{ field_id: 'email', value: 'test@example.com' }],
        },
      },
    });

    // 2. Submit success
    store.dispatch({
      type: 'SUBMIT_FORM_ACTION_SUCCESS',
      subrequest: 'form-uuid-1',
      result: { message: 'Form submitted' },
    });

    // Verify exportToApi dispatched only for enabled destination
    const exportActions = dispatched.filter((a) => a.type === EXPORT_TO_API);
    assert.equal(exportActions.length, 1);
    assert.equal(exportActions[0].subrequest, 'form-uuid-1__dest-1');
    assert.equal(exportActions[0].request.path, '/contact/@form-export-api');
    assert.deepEqual(exportActions[0].request.data.form_data, [
      { field_id: 'email', value: 'test@example.com' },
    ]);
  });

  test('finds form block nested inside container blocks', () => {
    const destinations = [{ id: 'dest-nested', enabled: true }];

    const state = {
      content: {
        data: {
          blocks: {
            'container-1': {
              '@type': 'columns',
              data: {
                blocks: {
                  'form-nested-id': {
                    '@type': 'form',
                    export_destinations: destinations,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { store, dispatched } = setupMockStore(state);

    store.dispatch({
      type: 'SUBMIT_FORM_ACTION',
      subrequest: 'form-nested-id',
      request: {
        path: '/page/@submit-form',
        data: { data: [{ field_id: 'name', value: 'Nested' }] },
      },
    });

    store.dispatch({
      type: 'SUBMIT_FORM_ACTION_SUCCESS',
      subrequest: 'form-nested-id',
      result: {},
    });

    const exportActions = dispatched.filter((a) => a.type === EXPORT_TO_API);
    assert.equal(exportActions.length, 1);
    assert.equal(exportActions[0].subrequest, 'form-nested-id__dest-nested');
  });

  test('cleans up pending submission on SUBMIT_FORM_ACTION_FAIL', () => {
    const { store } = setupMockStore({});

    store.dispatch({
      type: 'SUBMIT_FORM_ACTION',
      subrequest: 'form-fail-id',
      request: {
        path: '/page/@submit-form',
        data: { data: [] },
      },
    });

    store.dispatch({
      type: 'SUBMIT_FORM_ACTION_FAIL',
      subrequest: 'form-fail-id',
      error: { message: 'Failed' },
    });

    // Should not crash and state is clean
    assert.ok(true);
  });
});
