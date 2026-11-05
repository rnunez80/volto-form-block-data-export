/**
 * volto-form-block-data-export — Addon entry point
 *
 * Registers:
 *  1. Redux store enhancer (middleware) that intercepts SUBMIT_FORM_ACTION_SUCCESS
 *  2. Wraps the form block's `formSchema` function to inject a "Data Export" fieldset
 *  3. The ExportDestinationsWidget custom widget
 *  4. The exportToApi reducer
 *
 * Extension strategy:
 *  volto-form-block exposes `config.blocks.blocksConfig.form.formSchema` as a
 *  replaceable function. We wrap it: our wrapper calls the original and merges
 *  in the extra fieldset. This is the standard Volto pattern for extending a
 *  block's sidebar schema without forking upstream code.
 */

import { exportMiddlewareEnhancer } from './middleware/exportMiddleware';
import ExportDestinationsWidget from './components/ExportDestinationsWidget';
import { ExportFormSchemaExtender } from './formSchemaExtender';
import { exportToApi } from './reducers';

const applyConfig = (config) => {
  // 1. Redux store enhancer
  config.settings.storeExtenders = [
    ...(config.settings.storeExtenders || []),
    exportMiddlewareEnhancer,
  ];

  // 2. Wrap formSchema to inject the "Data Export" fieldset
  const formBlock = config.blocks.blocksConfig.form;
  if (formBlock && formBlock.formSchema) {
    const originalFormSchema = formBlock.formSchema;
    formBlock.formSchema = (data) => {
      const baseSchema = originalFormSchema(data);
      return ExportFormSchemaExtender(baseSchema, data);
    };
  }

  // 3. Custom widget registration
  config.widgets.widget.export_destinations_widget = ExportDestinationsWidget;

  // 4. Reducer
  config.addonReducers = {
    ...config.addonReducers,
    exportToApi,
  };

  return config;
};

export default applyConfig;

// Named exports for consumers who want to extend further
export { ExportDestinationsWidget, ExportFormSchemaExtender };
export { exportToApi as exportToApiAction } from './actions';
