import { AggregateOperations, defineView, ViewType } from 'twenty-sdk/define';
import { SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER, SALES_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice-line.object';
import { ITEM_ON_SALES_INVOICE_LINE_ID } from '../fields/item-on-sales-invoice-line.field';

export const SALES_INVOICE_LINES_TABLE_VIEW_ID = 'a82b6408-1c56-4cc0-8a4f-d44ba076e7d8';

export default defineView({
  universalIdentifier: SALES_INVOICE_LINES_TABLE_VIEW_ID,
  name: 'Sales Invoice Lines Table',
  objectUniversalIdentifier: SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '5d0533ce-11df-4bc5-82a2-d5c490a5fddc', fieldMetadataUniversalIdentifier: SALES_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: '55def8b2-acf3-458b-a7a2-b2209b6348d0', fieldMetadataUniversalIdentifier: ITEM_ON_SALES_INVOICE_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: '981a9879-1311-463a-8cad-64bbaeb4e474', fieldMetadataUniversalIdentifier: '53cfbda2-45c3-47bf-8664-c854dabdc008', position: 2, isVisible: true }, // quantity
    { universalIdentifier: 'b53686c1-3f83-49de-8828-6a566b869d64', fieldMetadataUniversalIdentifier: '889257f4-88e9-4e86-8d85-7164a603b3ce', position: 3, isVisible: true }, // price
    { universalIdentifier: '925e8c2f-2014-4a98-8169-b98a098af5e3', fieldMetadataUniversalIdentifier: 'cd48f4d8-9739-4562-80bd-6eaf32053133', position: 4, isVisible: true }, // vatRate
    { universalIdentifier: '470252c8-cb57-4aaa-8b55-e4b2ae453b16', fieldMetadataUniversalIdentifier: '4917430d-9aa5-4eae-9f67-406c0bb8043e', position: 5, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // amount
  ],
});
