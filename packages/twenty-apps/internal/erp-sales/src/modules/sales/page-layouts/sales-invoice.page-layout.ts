import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { LINES_ON_SALES_INVOICE_ID } from '../fields/sales-invoice-on-sales-invoice-line.field';
import { SALES_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID } from '../views/sales-invoice-record-page-fields.view';
import { SALES_INVOICE_LINES_TABLE_VIEW_ID } from '../views/sales-invoice-lines-table.view';

const PAGE_LAYOUT_ID = 'e28c1b62-f91d-49a3-a60d-6f026e9a1c73';
const DOCUMENT_TAB_ID = '907723ad-465c-4ef9-bc89-9a3525a7dcb7';
const FIELDS_WIDGET_ID = 'dfaab784-d231-4910-a282-5a6ab573f7ad';
const LINES_WIDGET_ID = '90e24d0f-3db8-4eac-915f-913b87a50027';
const TIMELINE_TAB_ID = '5f445759-8b20-4be2-a174-b15594dc5a9d';
const TIMELINE_WIDGET_ID = '09250bb4-0be4-40a0-8e1f-7db733b11816';
const TASKS_TAB_ID = '99526883-06a7-47d6-b5d9-6c333b6a0bd2';
const TASKS_WIDGET_ID = 'd3385da7-08ea-4c11-add3-c783b7e86a83';
const NOTES_TAB_ID = 'ba312eff-42b1-4400-be46-2a3da68990e5';
const NOTES_WIDGET_ID = '041a0e44-d9dd-48b1-9b7d-2736330fc307';
const FILES_TAB_ID = '88510bc3-0ee0-4c8d-8e97-db04c65f17fc';
const FILES_WIDGET_ID = '999bf8eb-c9a4-4ba7-9968-b1b3e6ded367';

// Заменяет автогенерированный layout объекта — без явного "Документ" таба
// поля не покажутся ("No Data"). Строки счёта — FIELD/TABLE (редактируемая
// RecordTable), а не чипы relation-виджета по умолчанию. Поле/table виджеты
// ссылаются на persisted defineView'ы (см. views/) чтобы задать порядок
// колонок и SUM-агрегат — без viewId FIELD/TABLE не рендерится вовсе.
//
// defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier намеренно не
// задан: указывая на таб, который создаётся в этом же apply, он ловит
// SDK apply-engine баг (pageLayout создаётся раньше своих pageLayoutTab —
// forward-reference не резолвится на чистом инстансе). Безопасно опустить,
// пока "Документ" остаётся табом с наименьшим position (0) — фронт для
// desktop/mobile/side-panel фолбэчится на tabs[0].
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Sales invoice record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconFileInvoice',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FIELDS_WIDGET_ID,
          title: 'Поля документа',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: SALES_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID,
          },
        },
        {
          universalIdentifier: LINES_WIDGET_ID,
          title: 'Строки',
          type: 'FIELD',
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: LINES_ON_SALES_INVOICE_ID,
            fieldDisplayMode: 'TABLE',
            viewId: SALES_INVOICE_LINES_TABLE_VIEW_ID,
          },
        },
      ],
    },
    {
      universalIdentifier: TIMELINE_TAB_ID,
      title: 'Хронология',
      position: 20,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: TIMELINE_WIDGET_ID,
          title: 'Хронология',
          type: 'TIMELINE',
          configuration: {
            configurationType: 'TIMELINE',
          },
        },
      ],
    },
    {
      universalIdentifier: TASKS_TAB_ID,
      title: 'Задачи',
      position: 30,
      icon: 'IconCheckbox',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: TASKS_WIDGET_ID,
          title: 'Задачи',
          type: 'TASKS',
          configuration: {
            configurationType: 'TASKS',
          },
        },
      ],
    },
    {
      universalIdentifier: NOTES_TAB_ID,
      title: 'Заметки',
      position: 40,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: NOTES_WIDGET_ID,
          title: 'Заметки',
          type: 'NOTES',
          configuration: {
            configurationType: 'NOTES',
          },
        },
      ],
    },
    {
      universalIdentifier: FILES_TAB_ID,
      title: 'Файлы',
      position: 50,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FILES_WIDGET_ID,
          title: 'Файлы',
          type: 'FILES',
          configuration: {
            configurationType: 'FILES',
          },
        },
      ],
    },
  ],
});
