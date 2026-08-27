import {
  AggregateOperations,
  definePageLayout,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';
import {
  ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  SALES_INVOICE_DOC_STATUS_FIELD_ID,
  SALES_INVOICE_POSTED_AT_FIELD_ID,
  SALES_INVOICE_TOTAL_FIELD_ID,
  SALES_INVOICE_UNIVERSAL_IDENTIFIER,
} from '../../../shared/erp-references';
import { SALES_INVOICE_DEBTORS_TABLE_VIEW_ID } from '../views/sales-invoice-debtors-table.view';
import { SALES_INVOICE_RECENT_TABLE_VIEW_ID } from '../views/sales-invoice-recent-table.view';
import { ITEM_BALANCE_TABLE_VIEW_ID } from '../views/item-balance-table.view';

export const ERP_SUMMARY_DASHBOARD_PAGE_LAYOUT_ID =
  '2c1a9e40-4f7e-4a8b-9e5a-1f2b3c4d5e10';

// Дашборд «ERP-сводка» (Task 9, Phase 9): 4 штатных виджета на живых
// данных всех ERP-блоков (erp-sales/erp-stock) — поэтому живёт в
// erp-accounting, единственном блоке, зависящем от всех остальных (см.
// application-config.ts `dependencies`). Дашборд-record (title+pageLayoutId)
// создаётся отдельно постинсталлом (logic-functions/post-install.ts) —
// платформа не даёт создать `dashboard`-запись декларативно через SDK
// (dashboard — объект данных, не метаданные).
export default definePageLayout({
  universalIdentifier: ERP_SUMMARY_DASHBOARD_PAGE_LAYOUT_ID,
  name: 'ERP-сводка',
  type: PageLayoutType.DASHBOARD,
  tabs: [
    {
      universalIdentifier: '2c1a9e40-4f7e-4a8b-9e5a-1f2b3c4d5e11',
      title: 'Обзор',
      position: 0,
      icon: 'IconLayoutDashboard',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        // Группировка по postedAt (не postingDate — см. комментарий у
        // SALES_INVOICE_POSTED_AT_FIELD_ID в erp-references.ts): штатная
        // конфигурация BAR_CHART (primaryAxisDateGranularity: MONTH)
        // полностью выражает «выручка по месяцам», симплификации типа не
        // потребовалось — только замена поля-источника даты.
        {
          universalIdentifier: '2c1a9e40-4f7e-4a8b-9e5a-1f2b3c4d5e12',
          title: 'Выручка по месяцам',
          type: 'GRAPH',
          objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
          gridPosition: { row: 0, column: 0, rowSpan: 4, columnSpan: 12 },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              SALES_INVOICE_TOTAL_FIELD_ID,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              SALES_INVOICE_POSTED_AT_FIELD_ID,
            primaryAxisDateGranularity:
              ObjectRecordGroupByDateGranularity.MONTH,
            primaryAxisOrderBy: 'FIELD_ASC',
            axisNameDisplay: 'NONE',
            displayDataLabel: true,
            displayLegend: false,
            color: 'green',
            layout: 'VERTICAL',
            timezone: 'UTC',
            firstDayOfTheWeek: 1,
            filter: {
              recordFilters: [
                {
                  fieldMetadataUniversalIdentifier:
                    SALES_INVOICE_DOC_STATUS_FIELD_ID,
                  operand: 'IS',
                  value: '["POSTED"]',
                },
              ],
            },
          },
        },
        {
          universalIdentifier: '2c1a9e40-4f7e-4a8b-9e5a-1f2b3c4d5e13',
          title: 'Долги покупателей',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
          gridPosition: { row: 4, column: 0, rowSpan: 5, columnSpan: 6 },
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: SALES_INVOICE_DEBTORS_TABLE_VIEW_ID,
            recordLimit: 10,
          },
        },
        {
          universalIdentifier: '2c1a9e40-4f7e-4a8b-9e5a-1f2b3c4d5e14',
          title: 'Остатки товаров',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
          gridPosition: { row: 4, column: 6, rowSpan: 5, columnSpan: 6 },
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: ITEM_BALANCE_TABLE_VIEW_ID,
            recordLimit: 10,
          },
        },
        {
          universalIdentifier: '2c1a9e40-4f7e-4a8b-9e5a-1f2b3c4d5e15',
          title: 'Последние счета',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
          gridPosition: { row: 9, column: 0, rowSpan: 5, columnSpan: 12 },
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: SALES_INVOICE_RECENT_TABLE_VIEW_ID,
            recordLimit: 10,
          },
        },
      ],
    },
  ],
});
