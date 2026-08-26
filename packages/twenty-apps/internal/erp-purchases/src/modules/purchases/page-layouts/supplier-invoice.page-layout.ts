import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { LINES_ON_SUPPLIER_INVOICE_ID } from '../fields/supplier-invoice-on-supplier-invoice-line.field';
import { SUPPLIER_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID } from '../views/supplier-invoice-record-page-fields.view';
import { SUPPLIER_INVOICE_LINES_TABLE_VIEW_ID } from '../views/supplier-invoice-lines-table.view';

const PAGE_LAYOUT_ID = '02811bff-d69e-4239-b905-e3fdd86f2eb2';
const DOCUMENT_TAB_ID = '42a93f48-62ab-4c4e-914f-3c627b145fbc';
const FIELDS_WIDGET_ID = '5457d4a9-8856-4bff-ae39-110177be2147';
const LINES_WIDGET_ID = '82eb9566-2e97-41bf-9577-8fc7fddb441c';
const POSITIONS_TAB_ID = '3abbf5a7-6c3b-4ace-99e0-db88a8e60ce8';
const TIMELINE_TAB_ID = 'a6243308-ebae-4c43-bcbe-92cb8d5a3f7f';
const TIMELINE_WIDGET_ID = 'f5394f22-07e8-40ed-9e70-ed7b85823a21';
const TASKS_TAB_ID = '26eacc7e-1e67-45b9-98f7-8594e29896e1';
const TASKS_WIDGET_ID = 'ace0e33d-5d22-4627-b250-8cd8ce09988e';
const NOTES_TAB_ID = '5f77a392-3e47-4c62-bdaa-4c2328be2ea9';
const NOTES_WIDGET_ID = '314eaa7f-2642-447b-a7d0-865692d90009';
const FILES_TAB_ID = '4448ca8c-de17-41bf-95ab-d181cb68cf9c';
const FILES_WIDGET_ID = 'eab84ff2-a65b-4d80-b267-afa0050e3019';

// Заменяет автогенерированный layout объекта — без явного "Документ" таба
// поля не покажутся ("No Data"). На десктопе первый по position таб
// пиннится в узкую левую панель (getTabsByDisplayMode.ts) — поэтому
// "Документ" (position 0) несёт только шапку (FIELDS), а строки — в
// отдельном полноширинном табе (position 1), который и становится
// активным по умолчанию: PageLayoutTabsRenderer.tsx сортирует и передаёт
// в таб-лист только НЕ-пиннед табы, так что tabs[0] там — этот таб.
// FIELD/TABLE и FIELDS виджеты ссылаются на persisted defineView'ы (см.
// views/) для порядка колонок и SUM-агрегата — без viewId FIELD/TABLE не
// рендерится вовсе.
//
// defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier намеренно не
// задан: указывая на таб создаваемый в этом же apply, он ловит SDK
// apply-engine баг (pageLayout создаётся раньше своих pageLayoutTab —
// forward-reference не резолвится на чистом инстансе). Безопасно опустить
// — на десктопе фолбэк уже выбирает нужный таб (см. выше); на
// mobile/side-panel (без пиннинга) фолбэк — tabs[0] по позиции, то есть
// "Документ" — приемлемо, там нет тесноты пиннед-панели.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Supplier invoice record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
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
            viewUniversalIdentifier: SUPPLIER_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID,
          },
        },
      ],
    },
    {
      universalIdentifier: POSITIONS_TAB_ID,
      title: 'Позиции',
      position: 1,
      icon: 'IconListDetails',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LINES_WIDGET_ID,
          title: 'Строки',
          type: 'FIELD',
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: LINES_ON_SUPPLIER_INVOICE_ID,
            fieldDisplayMode: 'TABLE',
            viewId: SUPPLIER_INVOICE_LINES_TABLE_VIEW_ID,
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
