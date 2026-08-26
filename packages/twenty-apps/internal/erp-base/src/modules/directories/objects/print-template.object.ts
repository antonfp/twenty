import { defineObject, FieldType } from 'twenty-sdk/define';

export enum PrintDocumentType {
  SCHET = 'SCHET',
  UPD = 'UPD',
}

export const PRINT_TEMPLATE_UNIVERSAL_IDENTIFIER =
  '65434929-2c0e-4531-b25f-ac983bb04b1a';

export const PRINT_TEMPLATE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '396e6126-f68a-4a55-ae98-4202e36e6b5f';

export default defineObject({
  universalIdentifier: PRINT_TEMPLATE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'printTemplate',
  namePlural: 'printTemplates',
  labelSingular: 'Шаблон печати',
  labelPlural: 'Шаблоны печати',
  description:
    'Переопределение печатной формы документа: активная запись подставляется вместо встроенного шаблона',
  icon: 'IconPrinter',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PRINT_TEMPLATE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: PRINT_TEMPLATE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '80f29a83-bc61-4f55-8694-f87af6e72cdb',
      type: FieldType.SELECT,
      name: 'documentType',
      label: 'Тип документа',
      icon: 'IconFileText',
      defaultValue: `'${PrintDocumentType.SCHET}'`,
      options: [
        {
          id: '10c3a632-191f-42ef-97f3-2854819b698f',
          value: PrintDocumentType.SCHET,
          label: 'Счёт',
          position: 0,
          color: 'blue',
        },
        {
          id: '92edf7fa-408a-4ace-a605-5e6a002d1c50',
          value: PrintDocumentType.UPD,
          label: 'УПД',
          position: 1,
          color: 'green',
        },
      ],
    },
    {
      universalIdentifier: '63235eee-d044-4b6d-855b-fabf9cf524aa',
      type: FieldType.TEXT,
      name: 'template',
      label: 'Шаблон (HTML)',
      description:
        'HTML с плейсхолдерами {{...}} и блоком <!-- BEGIN line -->…<!-- END line --> для строк',
      icon: 'IconCode',
    },
    {
      universalIdentifier: '01cc6c55-35c0-42b2-bebe-ef5417d1c3e2',
      type: FieldType.BOOLEAN,
      name: 'isActive',
      label: 'Активен',
      description: 'Используется при печати вместо встроенного шаблона',
      icon: 'IconToggleRight',
      defaultValue: false,
    },
    {
      universalIdentifier: '2ff69e7f-a886-4f1b-91d9-198ab8d0965b',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
