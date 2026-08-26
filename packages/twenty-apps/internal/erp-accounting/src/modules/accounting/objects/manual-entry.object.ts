import { defineObject, FieldType } from 'twenty-sdk/define';

export enum DocStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export const MANUAL_ENTRY_UNIVERSAL_IDENTIFIER =
  'a7fef56d-d3ff-4d95-851b-4df5d59d7ccb';

export const MANUAL_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '0a1bb0cb-6435-41ae-b44f-43d1aebf654d';

export default defineObject({
  universalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  nameSingular: 'manualEntry',
  namePlural: 'manualEntries',
  labelSingular: 'Ручная операция',
  labelPlural: 'Ручные операции',
  description: 'Ручная бухгалтерская операция (произвольная проводка/группа проводок)',
  icon: 'IconPencilPlus',
  labelIdentifierFieldMetadataUniversalIdentifier:
    MANUAL_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: MANUAL_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Ручная операция № ME-7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'cc381b1d-1395-4448-b68a-323e431144f7',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      description: 'Формат «ME-<порядковый номер>» — присваивает сервер при проведении',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'e17a5ce1-22c3-43ac-ab1c-b489fc71e16f',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: 'fa83f33c-8785-43bf-a4a5-ebc50cc14ac1',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'd071c057-849c-40d3-b242-dfb9935a1f9a',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: '6d152b30-5c1f-41e7-82b4-3d374c9577b0',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: '0671e137-5027-427c-829a-aec59ccba48b',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'd04cc68f-d129-445a-a0fa-58c1d029de05',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '5f01d97f-514c-42a9-904b-9b67f44935cd',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: 'f4cebb15-2cc7-46cb-a939-c5997951f6e7',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
