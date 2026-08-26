import { defineObject, FieldType } from 'twenty-sdk/define';

export enum AccountKind {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
  ACTIVE_PASSIVE = 'ACTIVE_PASSIVE',
}

export const ACCOUNT_UNIVERSAL_IDENTIFIER =
  '412bff53-1e68-44f2-b1d9-2f5a48e252dc';

export const ACCOUNT_CODE_FIELD_UNIVERSAL_IDENTIFIER =
  'cef6287b-89af-45f7-a923-89daf7e62fac';

export default defineObject({
  universalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'account',
  namePlural: 'accounts',
  labelSingular: 'Счёт учёта',
  labelPlural: 'План счетов',
  description: 'Синтетический счёт (субсчёт) рабочего плана счетов РСБУ',
  icon: 'IconListNumbers',
  labelIdentifierFieldMetadataUniversalIdentifier:
    ACCOUNT_CODE_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: ACCOUNT_CODE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'code',
      label: 'Код',
      description:
        'Например «41.01» или «19.04» — уникальность проверяет post-install seed',
      icon: 'IconHash',
    },
    {
      universalIdentifier: 'b8e6de85-c02b-47bc-8baa-3c1523b2ae8f',
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '15a34c08-ccc3-4b49-b3f6-160995f95fbe',
      type: FieldType.SELECT,
      name: 'kind',
      label: 'Вид счёта',
      icon: 'IconArrowsLeftRight',
      options: [
        {
          id: '226f3a55-3d47-419e-b282-38c4ea7d74aa',
          value: AccountKind.ACTIVE,
          label: 'Активный',
          position: 0,
          color: 'blue',
        },
        {
          id: '566f7280-5bb2-46b5-8f54-ee19703c081a',
          value: AccountKind.PASSIVE,
          label: 'Пассивный',
          position: 1,
          color: 'orange',
        },
        {
          id: 'c5e82e57-1161-42ca-a93c-c4e974166b82',
          value: AccountKind.ACTIVE_PASSIVE,
          label: 'Активно-пассивный',
          position: 2,
          color: 'purple',
        },
      ],
    },
    {
      universalIdentifier: 'f8c17f74-ad02-4c66-898b-67b1a539d5b5',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
