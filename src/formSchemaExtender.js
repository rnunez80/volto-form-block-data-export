/**
 * Form schema extender for volto-form-block-data-export.
 *
 * Integrates "Stream data" as a boolean toggle inside the form block's
 * "Manage data" fieldset alongside "Send email to recipient" and "Store compiled data".
 *
 * When "Stream data" is checked, the export destinations configuration widget
 * is conditionally displayed directly beneath it.
 */

export const ExportFormSchemaExtender = (schema, data = {}) => {
  const isStreamEnabled = Boolean(
    data?.stream_data ?? data?.streamData ?? data?.stream,
  );
  const isEmailEnabled = Boolean(data?.send ?? data?.sendEmail);
  const isStoreEnabled = Boolean(data?.store ?? data?.storeData);

  // Extend manage_data fieldset with stream_data toggle and conditional export_destinations
  const fieldsets = (schema.fieldsets || []).map((fs) => {
    if (fs.id === 'manage_data') {
      const existingFields = fs.fields.filter(
        (f) => f !== 'stream_data' && f !== 'export_destinations',
      );
      return {
        ...fs,
        fields: [
          ...existingFields,
          'stream_data',
          ...(isStreamEnabled ? ['export_destinations'] : []),
        ],
      };
    }
    return fs;
  });

  // If manage_data was not found in schema, fallback
  const hasManageData = fieldsets.some((fs) => fs.id === 'manage_data');
  const finalFieldsets = hasManageData
    ? fieldsets
    : [
        ...fieldsets,
        {
          id: 'manage_data',
          title: 'Manage data',
          fields: [
            'stream_data',
            ...(isStreamEnabled ? ['export_destinations'] : []),
          ],
        },
      ];

  // Destination requirement validation
  let required = schema.required || [];
  if (isStreamEnabled) {
    // If stream data is enabled, the form destination requirement is satisfied
    required = required.filter((r) => r !== 'store' && r !== 'send');
  } else if (!isStoreEnabled && !isEmailEnabled) {
    if (!required.includes('stream_data')) {
      required = [...required, 'stream_data'];
    }
  }

  return {
    ...schema,
    fieldsets: finalFieldsets,
    properties: {
      ...schema.properties,
      stream_data: {
        type: 'boolean',
        title: 'Stream data',
      },
      export_destinations: {
        title: 'Export Destinations',
        description:
          'Send form submissions to external APIs via the Plone server proxy.',
        widget: 'export_destinations_widget',
        default: [],
      },
    },
    required,
  };
};

export default ExportFormSchemaExtender;
