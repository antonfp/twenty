import {
  defineView,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';
import {
  CUSTOMER_ON_SALES_INVOICE_FIELD_ID,
  SALES_INVOICE_DOC_STATUS_FIELD_ID,
  SALES_INVOICE_NUMBER_FIELD_ID,
  SALES_INVOICE_PAYMENT_STATUS_FIELD_ID,
  SALES_INVOICE_POSTED_AT_FIELD_ID,
  SALES_INVOICE_TOTAL_FIELD_ID,
  SALES_INVOICE_UNIVERSAL_IDENTIFIER,
} from '../../../shared/erp-references';

export const SALES_INVOICE_RECENT_TABLE_VIEW_ID =
  '6e9d0e6a-6cf0-4d5a-9d0e-7b6c8f2a1e02';

// Дашборд «ERP-сводка», виджет «Последние счета» — по ruling'у плана только
// НЕОПЛАЧЕННЫЕ (paymentStatus IS_NOT PAID; DRAFT-счета остаются видны — они
// ещё не оплачены по определению), сорт по postedAt DESC (не postingDate —
// см. комментарий у SALES_INVOICE_POSTED_AT_FIELD_ID). У DRAFT-счетов
// postedAt не проставлен — такие уходят в конец сортировки.
export default defineView({
  universalIdentifier: SALES_INVOICE_RECENT_TABLE_VIEW_ID,
  name: 'Последние счета (дашборд)',
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-2a2b3c4d5e01',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_NUMBER_FIELD_ID,
      position: 0,
      isVisible: true,
    }, // number
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-2a2b3c4d5e02',
      fieldMetadataUniversalIdentifier: CUSTOMER_ON_SALES_INVOICE_FIELD_ID,
      position: 1,
      isVisible: true,
    }, // customer
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-2a2b3c4d5e03',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_DOC_STATUS_FIELD_ID,
      position: 2,
      isVisible: true,
    }, // docStatus
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-2a2b3c4d5e04',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_TOTAL_FIELD_ID,
      position: 3,
      isVisible: true,
    }, // total
  ],
  filters: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-2a2b3c4d5f11',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_PAYMENT_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS_NOT,
      value: ['PAID'],
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-2a2b3c4d5f01',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_POSTED_AT_FIELD_ID,
      direction: ViewSortDirection.DESC,
    },
  ],
});
