import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { LINES_ON_GOODS_WRITE_OFF_ID } from '../fields/goods-write-off-on-goods-write-off-line.field';
import { GOODS_WRITE_OFF_RECORD_PAGE_FIELDS_VIEW_ID } from '../views/goods-write-off-record-page-fields.view';
import { GOODS_WRITE_OFF_LINES_TABLE_VIEW_ID } from '../views/goods-write-off-lines-table.view';

const PAGE_LAYOUT_ID = '3a3a8fc2-bb97-42f9-ad5e-8b9c010d3aaa';
const DOCUMENT_TAB_ID = 'c8e2580a-4501-4e0c-8763-ab4da18f27ac';
const FIELDS_WIDGET_ID = '56907388-6ea3-46d7-9f54-8e7eecdb0cb0';
const LINES_WIDGET_ID = '08e6784f-9a1f-461d-8ef9-b2d14600972a';
const POSITIONS_TAB_ID = '6ea45d7f-ce7c-4ec3-b2f1-cfd492eed203';
const TIMELINE_TAB_ID = 'c825d6b7-9003-4e4b-aa50-a9870ce23cb5';
const TIMELINE_WIDGET_ID = '7ea4a657-d3a0-44a2-8052-3ce519480382';
const TASKS_TAB_ID = 'cf6b1a5b-2386-4996-ac01-6d4326a157cb';
const TASKS_WIDGET_ID = 'efa5040d-1182-42f0-a39e-b660362a15ca';
const NOTES_TAB_ID = '5d92b399-78df-4323-a276-39d573956ebf';
const NOTES_WIDGET_ID = '25b6c04c-1f0a-4012-bd6a-15bef3d9a8b0';
const FILES_TAB_ID = '150b911b-e67d-4219-8d88-9d90d54f3b12';
const FILES_WIDGET_ID = '64d295b4-0fb5-4dcc-94f5-33696fc07e44';

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
  name: 'Goods write-off record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconPackageOff',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FIELDS_WIDGET_ID,
          title: 'Поля документа',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: GOODS_WRITE_OFF_RECORD_PAGE_FIELDS_VIEW_ID,
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
            fieldMetadataId: LINES_ON_GOODS_WRITE_OFF_ID,
            fieldDisplayMode: 'TABLE',
            viewId: GOODS_WRITE_OFF_LINES_TABLE_VIEW_ID,
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
