import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';

// Self-relation: amendedFrom points at the original POSTED salesInvoice this
// DRAFT corrects (Task 6, ruling «Ruling (исправления/amend)»); SET_NULL so
// deleting the original never blocks or cascades onto its revisions.
export const AMENDED_FROM_ON_SALES_INVOICE_ID =
  'c2a9a3c8-7296-4e20-b52e-dae4db65c5c3';
export const REVISIONS_ON_SALES_INVOICE_ID =
  'b987e4cd-e15e-4e2d-8923-b5decaececbd';

export default defineField({
  universalIdentifier: AMENDED_FROM_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'amendedFrom',
  label: 'Исправляет счёт',
  description: 'Оригинальный счёт, который исправляет этот документ',
  icon: 'IconArrowBackUp',
  relationTargetObjectMetadataUniversalIdentifier:
    SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: REVISIONS_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'amendedFromId',
  },
});
