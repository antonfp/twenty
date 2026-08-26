import { AggregateOperations, ViewFilterOperand, defineView, ViewType } from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER, MANUAL_ENTRY_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { DEBIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID } from '../fields/debit-account-on-manual-entry-line.field';
import { CREDIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID } from '../fields/credit-account-on-manual-entry-line.field';
import { PARTY_ON_MANUAL_ENTRY_LINE_ID } from '../fields/party-on-manual-entry-line.field';
import { ITEM_ON_MANUAL_ENTRY_LINE_ID } from '../fields/item-on-manual-entry-line.field';
import { MANUAL_ENTRY_ON_MANUAL_ENTRY_LINE_ID } from '../fields/manual-entry-on-manual-entry-line.field';

export const MANUAL_ENTRY_LINES_TABLE_VIEW_ID = '2fb57f83-e875-4aa6-a3dc-0dc6a73864b7';

export default defineView({
  universalIdentifier: MANUAL_ENTRY_LINES_TABLE_VIEW_ID,
  name: 'Manual Entry Lines Table',
  objectUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '6efa8b73-0ff8-410a-b1c3-72043d3d0669', fieldMetadataUniversalIdentifier: MANUAL_ENTRY_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: '90855c4c-c881-4aa4-8dfb-820d647e730c', fieldMetadataUniversalIdentifier: DEBIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID, position: 1, isVisible: true }, // debitAccount
    { universalIdentifier: '90b5cb72-bf2f-43d1-8bd1-c6c54c56f878', fieldMetadataUniversalIdentifier: CREDIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID, position: 2, isVisible: true }, // creditAccount
    { universalIdentifier: 'eb7f8d17-3d31-4c8d-9c6e-9537f7f98dce', fieldMetadataUniversalIdentifier: '68887efe-0e26-4eb3-8a85-0529d0b8ed28', position: 3, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // amount
    { universalIdentifier: '62bc2365-7610-45b6-9a35-1d6e53e40f36', fieldMetadataUniversalIdentifier: PARTY_ON_MANUAL_ENTRY_LINE_ID, position: 4, isVisible: true }, // party
    { universalIdentifier: 'b8cfb533-6dbc-42c3-9320-a385ac436ba4', fieldMetadataUniversalIdentifier: ITEM_ON_MANUAL_ENTRY_LINE_ID, position: 5, isVisible: true }, // item
  ],
  filters: [
    {
      universalIdentifier: '1f4bd330-634e-4e36-8a9c-6d274e96d71c',
      fieldMetadataUniversalIdentifier: MANUAL_ENTRY_ON_MANUAL_ENTRY_LINE_ID,
      operand: ViewFilterOperand.IS,
      value: '{"selectedRecordIds":[],"isCurrentRecordSelected":true}',
    },
  ],
});
