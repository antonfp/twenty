import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { GOODS_POSTING_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting.object';
import { LINES_ON_GOODS_POSTING_ID } from '../fields/goods-posting-on-goods-posting-line.field';
import { GOODS_POSTING_RECORD_PAGE_FIELDS_VIEW_ID } from '../views/goods-posting-record-page-fields.view';
import { GOODS_POSTING_LINES_TABLE_VIEW_ID } from '../views/goods-posting-lines-table.view';

const PAGE_LAYOUT_ID = '4e92d876-3553-4de6-9a4f-b4ff290b2cf4';
const DOCUMENT_TAB_ID = '5b6c873e-0b95-42ef-9a0a-ee539d014e37';
const FIELDS_WIDGET_ID = 'b11a6367-d021-44d7-a506-a62f8fbdb9e6';
const LINES_WIDGET_ID = '87831b46-94a3-4df0-88d3-aedb45c29620';
const POSITIONS_TAB_ID = '45644bd1-1db7-4ae5-b8ba-e19ed11b2f19';
const TIMELINE_TAB_ID = '3d8e7daa-6160-4bca-93a9-08e661cec7ee';
const TIMELINE_WIDGET_ID = 'fa02c3d8-44ad-4d09-8e0f-a8fae8e6d9ff';
const TASKS_TAB_ID = 'ae3b9ee8-6846-43f3-b7fa-6fe7058a3dac';
const TASKS_WIDGET_ID = '0b5955a8-38d0-45b5-ad30-28bd4c5d060d';
const NOTES_TAB_ID = '62c29b31-e8cf-4177-9bdb-48abbf305d20';
const NOTES_WIDGET_ID = '80fc4a4d-3b9f-42c0-a0a0-07d5f5ca0184';
const FILES_TAB_ID = '65024769-9e6b-4605-9a3c-d9919678224f';
const FILES_WIDGET_ID = 'aeb09900-41b9-4510-85ff-bbfdfeacfd0e';

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
  name: 'Goods posting record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconPackages',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FIELDS_WIDGET_ID,
          title: 'Поля документа',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: GOODS_POSTING_RECORD_PAGE_FIELDS_VIEW_ID,
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
            fieldMetadataId: LINES_ON_GOODS_POSTING_ID,
            fieldDisplayMode: 'TABLE',
            viewId: GOODS_POSTING_LINES_TABLE_VIEW_ID,
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
