import { AggregateOperations, defineView, ViewType } from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER, SUPPLIER_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice-line.object';
import { ITEM_ON_SUPPLIER_INVOICE_LINE_ID } from '../fields/item-on-supplier-invoice-line.field';

export const SUPPLIER_INVOICE_LINES_TABLE_VIEW_ID = 'bc2138be-2372-482a-be8b-e8949efbb753';

export default defineView({
  universalIdentifier: SUPPLIER_INVOICE_LINES_TABLE_VIEW_ID,
  name: 'Supplier Invoice Lines Table',
  objectUniversalIdentifier: SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '3fc38e2b-82a3-4f27-99d2-4a556fdad6c9', fieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: 'f3c48d86-d3ff-4f3d-8b89-e33e53cde754', fieldMetadataUniversalIdentifier: ITEM_ON_SUPPLIER_INVOICE_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: '96c4d41f-536a-4902-bf13-ed9b920c266f', fieldMetadataUniversalIdentifier: 'b0686780-48ef-47e1-b86c-dbb89fbccfb7', position: 2, isVisible: true }, // quantity
    { universalIdentifier: '1a39c514-d19f-4871-9936-fa1633d40428', fieldMetadataUniversalIdentifier: 'd3f0acc9-852d-4d81-a24d-0fbce70280eb', position: 3, isVisible: true }, // price
    { universalIdentifier: 'cb1a60c8-9bca-40be-9f39-3dff3947ec34', fieldMetadataUniversalIdentifier: '690de523-989f-4683-913d-5061d860bc99', position: 4, isVisible: true }, // vatRate
    { universalIdentifier: 'f887004f-1d25-4111-a1e1-d6cb61b32d43', fieldMetadataUniversalIdentifier: '4a8b604a-8c27-40c4-810b-664f4cd11483', position: 5, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // amount
  ],
});
