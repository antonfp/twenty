import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';

const PAGE_LAYOUT_ID = 'efa0e3d3-53a0-4db6-b89e-982e7bbaf9a4';
const DOCUMENT_TAB_ID = '4b49b7cc-60fd-424c-a852-0782d2a66f63';
const FIELDS_WIDGET_ID = 'd20990c7-2248-4cbe-96ea-59009f5298f6';
const TIMELINE_TAB_ID = 'dcceda48-aba0-4418-8b4f-539dfdb0abd3';
const TIMELINE_WIDGET_ID = 'ce299da3-4145-4376-95f7-15844c8dd6ab';
const TASKS_TAB_ID = '944a792a-8c43-42f8-aaf0-b01417ed0ca6';
const TASKS_WIDGET_ID = '98cada06-64a2-4b7e-b44b-1140ba3bf17b';
const NOTES_TAB_ID = 'f558390a-8095-4d4d-ad35-d337bcb9b23e';
const NOTES_WIDGET_ID = '6fb437cf-9ffa-4883-a6ee-469ea3e620ba';
const FILES_TAB_ID = '039ace6e-248f-49d3-9d7e-e04bae149437';
const FILES_WIDGET_ID = 'e2c786c8-cfad-408a-ba36-7ba22ea17964';

// Оплата поставщику — документ без табличной части, только улучшенная
// шапка (FIELDS). Заменяет автогенерированный layout объекта.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Supplier payment record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconCash',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FIELDS_WIDGET_ID,
          title: 'Поля документа',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
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
