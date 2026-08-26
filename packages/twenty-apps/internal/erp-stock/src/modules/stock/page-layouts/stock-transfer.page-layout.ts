import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { LINES_ON_STOCK_TRANSFER_ID } from '../fields/stock-transfer-on-stock-transfer-line.field';

const PAGE_LAYOUT_ID = 'ab968024-b844-4c4e-a6cc-9de32cab147a';
const DOCUMENT_TAB_ID = '10c403e7-8df5-423c-bd70-b5c200f13b9b';
const FIELDS_WIDGET_ID = 'ed1268b6-0c2d-4fa0-bfc0-84d0c608ca5c';
const LINES_WIDGET_ID = 'a0ae25ca-78ef-4eed-8040-172ef37cf4bc';
const TIMELINE_TAB_ID = '410dc238-8822-4b67-9989-0133e49ca722';
const TIMELINE_WIDGET_ID = '4134852a-3665-4937-887b-47614aa46e37';
const TASKS_TAB_ID = '97f4f482-f3e1-4308-a655-3d2b9b4c1736';
const TASKS_WIDGET_ID = '12aa4714-064a-4672-8a1d-db7658bec434';
const NOTES_TAB_ID = '4298ea25-81fc-4330-935c-e9b7067e106e';
const NOTES_WIDGET_ID = '8f07d4c4-043b-4195-8116-1bb10e489671';
const FILES_TAB_ID = 'ba4ea27e-0331-4c4f-a4c2-ecfb985ee28b';
const FILES_WIDGET_ID = '85d02cd5-cf1d-43b6-8302-f0eb7842bf5d';

// Заменяет автогенерированный layout объекта — без явного "Документ" таба
// поля не покажутся ("No Data"). Строки перемещения — FIELD/TABLE
// (редактируемая RecordTable), а не чипы relation-виджета по умолчанию.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Stock transfer record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconTransfer',
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
            fieldMetadataId: LINES_ON_STOCK_TRANSFER_ID,
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
