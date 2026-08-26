import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { LINES_ON_SALES_SHIPMENT_ID } from '../fields/sales-shipment-on-sales-shipment-line.field';

const PAGE_LAYOUT_ID = '2877abe9-4590-4c17-a8a1-6e290f2721c5';
const DOCUMENT_TAB_ID = '50b4ad05-03ca-42b8-9727-e735413a749b';
const FIELDS_WIDGET_ID = '2d86255b-e8d5-4a73-8bc8-f6a031b159f2';
const LINES_WIDGET_ID = 'c84aace2-a2d6-4f46-b555-ca63fa519eb2';
const TIMELINE_TAB_ID = 'e88f1b4b-6d5f-4dc2-b60c-0cabf809a9f8';
const TIMELINE_WIDGET_ID = 'cf742fb4-ec6b-43ea-af44-629482770937';
const TASKS_TAB_ID = 'abb9eac0-5af3-43da-be03-a0916ff25e01';
const TASKS_WIDGET_ID = '69d7fb35-1f40-40f9-b128-11b8d42072ba';
const NOTES_TAB_ID = '97e2f5da-7d90-4491-b92a-f792adce2aeb';
const NOTES_WIDGET_ID = 'dc826e38-b6ba-4d55-95a2-0e3d5fd60ca8';
const FILES_TAB_ID = 'e925934e-03dc-40f1-941a-cc3b7caef73c';
const FILES_WIDGET_ID = 'fc42d482-45c1-41ab-8b9a-9f23dc857a9e';

// Заменяет автогенерированный layout объекта — без явного "Документ" таба
// поля не покажутся ("No Data"). Строки реализации — FIELD/TABLE
// (редактируемая RecordTable), а не чипы relation-виджета по умолчанию.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Sales shipment record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconPackageExport',
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
        {
          universalIdentifier: LINES_WIDGET_ID,
          title: 'Строки',
          type: 'FIELD',
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: LINES_ON_SALES_SHIPMENT_ID,
            fieldDisplayMode: 'TABLE',
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
