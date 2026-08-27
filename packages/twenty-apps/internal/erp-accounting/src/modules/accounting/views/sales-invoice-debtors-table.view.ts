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
  SALES_INVOICE_PAID_AMOUNT_FIELD_ID,
  SALES_INVOICE_PAYMENT_STATUS_FIELD_ID,
  SALES_INVOICE_TOTAL_FIELD_ID,
  SALES_INVOICE_UNIVERSAL_IDENTIFIER,
} from '../../../shared/erp-references';

export const SALES_INVOICE_DEBTORS_TABLE_VIEW_ID =
  '6e9d0e6a-6cf0-4d5a-9d0e-7b6c8f2a1e01';

// Дашборд «ERP-сводка», виджет «Долги покупателей» — топ неоплаченных
// POSTED-счетов. «Топ» отсортирован по total (сумма счёта), а не по
// остатку (total-paidAmount): вычисляемого поля нет, а формульных полей на
// объекте нет — упрощение MVP, задокументировано в task-9-report.md.
export default defineView({
  universalIdentifier: SALES_INVOICE_DEBTORS_TABLE_VIEW_ID,
  name: 'Долги покупателей (дашборд)',
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5e01',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_NUMBER_FIELD_ID,
      position: 0,
      isVisible: true,
    }, // number
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5e02',
      fieldMetadataUniversalIdentifier: CUSTOMER_ON_SALES_INVOICE_FIELD_ID,
      position: 1,
      isVisible: true,
    }, // customer
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5e03',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_TOTAL_FIELD_ID,
      position: 2,
      isVisible: true,
    }, // total
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5e04',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_PAID_AMOUNT_FIELD_ID,
      position: 3,
      isVisible: true,
    }, // paidAmount
  ],
  filters: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5f01',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_DOC_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['POSTED'],
    },
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5f02',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_PAYMENT_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS_NOT,
      value: ['PAID'],
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-1a2b3c4d5f03',
      fieldMetadataUniversalIdentifier: SALES_INVOICE_TOTAL_FIELD_ID,
      direction: ViewSortDirection.DESC,
    },
  ],
});
