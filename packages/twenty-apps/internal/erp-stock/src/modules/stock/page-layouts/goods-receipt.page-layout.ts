import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { LINES_ON_GOODS_RECEIPT_ID } from '../fields/goods-receipt-on-goods-receipt-line.field';

const PAGE_LAYOUT_ID = 'af2e08a5-c256-4900-866b-21220cde0fc1';
const DOCUMENT_TAB_ID = '5b80057c-a0b7-4af0-a624-5aecbcec5e6f';
const FIELDS_WIDGET_ID = 'f7d4d52d-46dc-4ca3-91ec-848f94f116f5';
const LINES_WIDGET_ID = 'eb5926ba-8bad-4ade-88c1-668865b3bb79';
const TIMELINE_TAB_ID = '8989f9fe-156d-4a3c-9967-cf38ff34a954';
const TIMELINE_WIDGET_ID = 'b488dcea-d801-4c6b-a291-8e1325082d62';
const TASKS_TAB_ID = '45bd9105-86e1-4c45-bcf1-e98e719f4e64';
const TASKS_WIDGET_ID = '41563b10-f194-4d16-ab69-227047256142';
const NOTES_TAB_ID = '5370ad41-7a58-4663-aca3-9b3b9572aa5f';
const NOTES_WIDGET_ID = '3343e108-eead-474d-a1bc-47dc7996d3f5';
const FILES_TAB_ID = '720919cf-7fd5-4c13-aba5-286c45b458a3';
const FILES_WIDGET_ID = '73c9d038-4196-4c7c-b9f6-9936aef6b3f5';

// Заменяет автогенерированный layout объекта — без явного "Документ" таба
// поля не покажутся ("No Data"). Строки поступления — FIELD/TABLE
// (редактируемая RecordTable), а не чипы relation-виджета по умолчанию.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Goods receipt record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconPackageImport',
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
            fieldMetadataId: LINES_ON_GOODS_RECEIPT_ID,
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
