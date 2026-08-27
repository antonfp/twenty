import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './manual-entry.object';

export const MONTH_CLOSE_UNIVERSAL_IDENTIFIER =
  '1581ee73-398b-4db3-a35d-c45dc92c3d76';

export const MONTH_CLOSE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '6c548061-c656-469e-bac6-f84389e2da2f';

export const MONTH_CLOSE_PERIOD_FIELD_UNIVERSAL_IDENTIFIER =
  '1ff04467-0916-4b7b-91ba-05ebc4440f6a';

export const MONTH_CLOSE_IS_YEAR_REFORMATION_FIELD_UNIVERSAL_IDENTIFIER =
  '693db574-d3da-492a-b1d0-9a1b0763b3c8';

// Закрытие месяца (Task 5, research §3): документ без табличной части —
// проводки закрытия (90.09/91.09→99, реформация 99→84) пишет GL-контрибьютор
// прямо из сальдо регистра glEntry, а не из строк документа. period — первое
// число закрываемого месяца (валидирует провайдер при проведении);
// isYearReformation — «Реформация года», доступно только для декабря.
export default defineObject({
  universalIdentifier: MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'monthClose',
  namePlural: 'monthCloses',
  labelSingular: 'Закрытие месяца',
  labelPlural: 'Закрытия месяца',
  description:
    'Регламентная операция закрытия месяца: списание сальдо 90.09/91.09 на счёт 99, при реформации — обнуление субсчетов 90.x/91.x и закрытие 99 на 84',
  icon: 'IconCalendarCheck',
  labelIdentifierFieldMetadataUniversalIdentifier:
    MONTH_CLOSE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: MONTH_CLOSE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Закрытие месяца № MC-3 от 30.09.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'fc910386-ea4a-4104-ab49-46672eda48c9',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      description: 'Формат «MC-<порядковый номер>» — присваивает сервер при проведении',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '2a862691-fd5b-4a0f-a93a-6201f12a26de',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: '5e6dacc8-1185-4e4f-b943-d1bd262163f4',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'e1fe20b3-f529-439d-b626-8ff07f874058',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: '8b0968ec-611e-457d-b09e-7e682aae3f19',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'fae854c1-d4ff-441f-8c7c-c0141e810097',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: MONTH_CLOSE_PERIOD_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE,
      name: 'period',
      label: 'Период (месяц)',
      description: 'Первое число закрываемого месяца, например 01.09.2026',
      icon: 'IconCalendarStats',
      isNullable: true,
    },
    {
      universalIdentifier:
        MONTH_CLOSE_IS_YEAR_REFORMATION_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.BOOLEAN,
      name: 'isYearReformation',
      label: 'Реформация года',
      description:
        'Дополнительно обнуляет субсчета 90.x/91.x и закрывает счёт 99 на 84 — только для декабря',
      icon: 'IconRefresh',
      defaultValue: false,
    },
    {
      universalIdentifier: '5567d055-7820-4997-96c4-a7ed70993302',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'fffd0b76-8efe-4709-a09d-7b034109f375',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: 'efb9fa76-2686-462c-bd0b-3a4488b5e163',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
