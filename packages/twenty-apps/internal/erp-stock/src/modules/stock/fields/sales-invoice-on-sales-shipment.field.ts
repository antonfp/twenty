import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const SALES_INVOICE_ON_SALES_SHIPMENT_ID = 'e5576a22-6038-48ed-a9ec-945169daf94a';
export const SALES_SHIPMENTS_ON_SALES_INVOICE_ID = '68632176-3499-479b-82bb-a192d84d8d01';

export default defineField({
  universalIdentifier: SALES_INVOICE_ON_SALES_SHIPMENT_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesInvoice',
  label: 'Счёт покупателю',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_SHIPMENTS_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'salesInvoiceId',
  },
});
