import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { ERP_DOCUMENT_OBJECTS } from '@/erp-documents/constants/ErpDocumentObjects';
import { ERP_ENGINE_COMPONENT_KEYS } from '@/erp-documents/constants/ErpEngineComponentKeys';
import {
  CommandMenuItemAvailabilityType,
  type CommandMenuItemFieldsFragment,
  type EngineComponentKey,
} from '~/generated-metadata/graphql';

const SINGLE_RECORD_EXPRESSION = 'numberOfSelectedRecords == 1';

type BuildErpDocumentCommandMenuItemParams = {
  idPrefix: string;
  engineComponentKey: string;
  label: string;
  icon: string;
  position: number;
  conditionalAvailabilityExpression: string;
  objectMetadataId: string;
};

const buildErpDocumentCommandMenuItem = ({
  idPrefix,
  engineComponentKey,
  label,
  icon,
  position,
  conditionalAvailabilityExpression,
  objectMetadataId,
}: BuildErpDocumentCommandMenuItemParams): CommandMenuItemFieldsFragment => ({
  __typename: 'CommandMenuItem',
  id: `${idPrefix}-${objectMetadataId}`,
  applicationId: null,
  workflowVersionId: null,
  frontComponentId: null,
  // Client-only key, resolved by ERP_ENGINE_COMPONENT_KEY_COMPONENT_MAP in
  // CommandRunner before the generated map is consulted.
  engineComponentKey: engineComponentKey as EngineComponentKey,
  label,
  icon,
  shortLabel: null,
  position,
  isPinned: true,
  hotKeys: null,
  conditionalAvailabilityExpression,
  availabilityType: CommandMenuItemAvailabilityType.RECORD_SELECTION,
  availabilityObjectMetadataId: objectMetadataId,
  pageLayoutId: null,
  isActive: true,
  frontComponent: null,
  payload: null,
});

// Injected client-side because command menu items are otherwise server
// metadata; returns [] for non-ERP objects.
export const buildErpDocumentCommandMenuItems = (
  objectMetadataItem: Record<string, unknown>,
): CommandMenuItemFieldsFragment[] => {
  const objectMetadataId = objectMetadataItem.id;
  const nameSingular = objectMetadataItem.nameSingular;

  if (
    !isNonEmptyString(objectMetadataId) ||
    !isNonEmptyString(nameSingular) ||
    !ERP_DOCUMENT_OBJECTS.NAME_SINGULARS.includes(nameSingular)
  ) {
    return [];
  }

  const items = [
    buildErpDocumentCommandMenuItem({
      idPrefix: 'erp-post-document',
      engineComponentKey: ERP_ENGINE_COMPONENT_KEYS.POST_DOCUMENT,
      label: t`Провести`,
      icon: 'IconChecks',
      position: 9000,
      conditionalAvailabilityExpression: `${SINGLE_RECORD_EXPRESSION} and everyEquals(selectedRecords, "docStatus", "DRAFT")`,
      objectMetadataId,
    }),
    buildErpDocumentCommandMenuItem({
      idPrefix: 'erp-cancel-document',
      engineComponentKey: ERP_ENGINE_COMPONENT_KEYS.CANCEL_DOCUMENT,
      label: t`Отменить проведение`,
      icon: 'IconArrowBackUp',
      position: 9001,
      conditionalAvailabilityExpression: `${SINGLE_RECORD_EXPRESSION} and everyEquals(selectedRecords, "docStatus", "POSTED")`,
      objectMetadataId,
    }),
  ];

  if (nameSingular === ERP_DOCUMENT_OBJECTS.SALES_INVOICE_NAME_SINGULAR) {
    items.push(
      buildErpDocumentCommandMenuItem({
        idPrefix: 'erp-print-sales-invoice',
        engineComponentKey: ERP_ENGINE_COMPONENT_KEYS.PRINT_SALES_INVOICE,
        label: t`Печать счёта`,
        icon: 'IconPrinter',
        position: 9002,
        conditionalAvailabilityExpression: SINGLE_RECORD_EXPRESSION,
        objectMetadataId,
      }),
    );
  }

  if (nameSingular === ERP_DOCUMENT_OBJECTS.SALES_SHIPMENT_NAME_SINGULAR) {
    items.push(
      buildErpDocumentCommandMenuItem({
        idPrefix: 'erp-print-sales-shipment-upd',
        engineComponentKey: ERP_ENGINE_COMPONENT_KEYS.PRINT_SALES_SHIPMENT_UPD,
        label: t`Печать УПД`,
        icon: 'IconPrinter',
        position: 9002,
        conditionalAvailabilityExpression: SINGLE_RECORD_EXPRESSION,
        objectMetadataId,
      }),
    );
  }

  return items;
};
