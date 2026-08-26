import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';

const PAGE_LAYOUT_ID = '183d70c2-7005-48c5-9565-276691d0f112';
const DOCUMENT_TAB_ID = '83b84aaf-4751-409e-9f5a-d8b55b7aefa9';
const FIELDS_WIDGET_ID = 'f524cc10-4ce8-4508-b101-c7b3b4dfc465';
const TIMELINE_TAB_ID = '6087dc27-28fa-4759-9b82-b2d46caf40f4';
const TIMELINE_WIDGET_ID = 'c131964f-b527-4501-9542-e5e761cef910';
const TASKS_TAB_ID = '0164c88c-3578-42f1-b15e-33cc0fe92d3c';
const TASKS_WIDGET_ID = '9aed51e6-ec61-496c-b0cb-d342b8f536b5';
const NOTES_TAB_ID = '18c558ff-b1f1-4f40-ad02-aaf4fa0afd1a';
const NOTES_WIDGET_ID = '35159e92-8944-4d50-80a7-c816efe34252';
const FILES_TAB_ID = '05f28514-77c7-47b0-8dfd-85b5870065c0';
const FILES_WIDGET_ID = '87b7f0b0-6f12-4bac-8602-35bd132f1759';

// Поступление оплаты — документ без табличной части, только улучшенная
// шапка (FIELDS). Заменяет автогенерированный layout объекта.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Payment record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
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
