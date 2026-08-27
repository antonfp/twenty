import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import {
  AMENDED_FROM_ON_SALES_INVOICE_ID,
  REVISIONS_ON_SALES_INVOICE_ID,
} from './amended-from-on-sales-invoice.field';

// Reverse side of amendedFrom — the corrections filed against this invoice.
export default defineField({
  universalIdentifier: REVISIONS_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'revisions',
  label: 'Исправления',
  description: 'Исправления, созданные на основе этого счёта',
  icon: 'IconArrowForwardUp',
  relationTargetObjectMetadataUniversalIdentifier:
    SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    AMENDED_FROM_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
