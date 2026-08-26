import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';
import { LINES_ON_MANUAL_ENTRY_ID } from '../fields/manual-entry-on-manual-entry-line.field';
import { MANUAL_ENTRY_RECORD_PAGE_FIELDS_VIEW_ID } from '../views/manual-entry-record-page-fields.view';
import { MANUAL_ENTRY_LINES_TABLE_VIEW_ID } from '../views/manual-entry-lines-table.view';

const PAGE_LAYOUT_ID = 'a85cf715-cf06-49d8-a840-fceab079c5a8';
const DOCUMENT_TAB_ID = 'c0ba038b-93c2-46bf-a737-c203f8daa166';
const FIELDS_WIDGET_ID = '3299e731-c47d-4471-813e-cc4a5bba0d11';
const LINES_WIDGET_ID = '313440b7-d9a7-4510-bba2-f1cabecf2b56';
const POSITIONS_TAB_ID = 'bd741424-684d-45f3-b199-7ae33191140b';
const TIMELINE_TAB_ID = '1ff6eaa9-0453-4e65-be46-5992c41d0abb';
const TIMELINE_WIDGET_ID = 'd97cc7d3-6592-4a8b-a1d7-2d6e146c5851';
const TASKS_TAB_ID = 'd34f200a-bc24-465e-a934-db6a7407ce11';
const TASKS_WIDGET_ID = 'c685dab9-44a3-42b1-b21a-815b6182d603';
const NOTES_TAB_ID = 'dc833200-db99-4c48-ab72-685334c15511';
const NOTES_WIDGET_ID = '6713a553-52d6-48cb-b909-b4d7e62fc616';
const FILES_TAB_ID = '35b960ab-7458-4ca5-912d-731e88067d42';
const FILES_WIDGET_ID = 'c60e8c5e-b16f-45e3-8703-e126ddb0d281';

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
  name: 'Manual entry record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconPencilPlus',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FIELDS_WIDGET_ID,
          title: 'Поля документа',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: MANUAL_ENTRY_RECORD_PAGE_FIELDS_VIEW_ID,
          },
        },
      ],
    },
    {
      universalIdentifier: POSITIONS_TAB_ID,
      title: 'Проводки',
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
            fieldMetadataId: LINES_ON_MANUAL_ENTRY_ID,
            fieldDisplayMode: 'TABLE',
            viewId: MANUAL_ENTRY_LINES_TABLE_VIEW_ID,
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
