import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { MONTH_CLOSE_UNIVERSAL_IDENTIFIER } from '../objects/month-close.object';
import { MONTH_CLOSE_RECORD_PAGE_FIELDS_VIEW_ID } from '../views/month-close-record-page-fields.view';

const PAGE_LAYOUT_ID = '7fa42f48-dc24-4bbf-8a51-ed043d4a35c4';
const DOCUMENT_TAB_ID = 'ed44c4fe-8643-4d8a-8458-08dd9d9b30d7';
const FIELDS_WIDGET_ID = 'd833aa5b-4355-441c-a282-c9ab176bdaa5';
const TIMELINE_TAB_ID = 'fd3c00c5-8efe-43fc-8d7d-c4b0b6b18e71';
const TIMELINE_WIDGET_ID = '3eb54743-4eb3-4b6c-9c8a-50f046857470';
const TASKS_TAB_ID = 'ab9c3b04-4cbb-43be-a484-272620dd710f';
const TASKS_WIDGET_ID = 'f99e7843-3437-40f8-9e3f-1ffbaf7f95a2';
const NOTES_TAB_ID = '391cc660-b0bb-4bc3-8099-e9e02cca928c';
const NOTES_WIDGET_ID = '7e5585f6-f0a1-4c72-be94-275fd88e4d12';
const FILES_TAB_ID = '6a68a32c-e053-48e3-a7fc-f7d0b325eee3';
const FILES_WIDGET_ID = '3818302c-ac03-415c-8342-a8bfbd73c09b';

// Закрытие месяца — документ без табличной части, только улучшенная шапка
// (FIELDS), по образцу payment.page-layout.ts: проводки закрытия смотрят в
// регистре glEntry, не в документе. Тот же обход SDK apply-engine forward-
// reference бага — defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier
// намеренно не задан (см. комментарий в payment.page-layout.ts).
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID,
  name: 'Month close record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: DOCUMENT_TAB_ID,
      title: 'Документ',
      position: 0,
      icon: 'IconCalendarCheck',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: FIELDS_WIDGET_ID,
          title: 'Поля документа',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: MONTH_CLOSE_RECORD_PAGE_FIELDS_VIEW_ID,
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
