import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

// ГОСТ Р 56042-2014 «Двумерные символы штрихового кода для осуществления
// платежей физических лиц» — формат ST0001x: статический QR, кодирующий
// банковские реквизиты получателя напрямую. Сканирование в приложении
// банка открывает обычный перевод по реквизитам (аналог квитанции/платёжки),
// НЕ эквайринговую транзакцию — не путать с СБП C2B-эквайрингом, отдельным
// протоколом через НСПК (research §5, docs/research/phase9-10-ru-accounting.md).
// Суффикс "2" в заголовке — кодировка UTF-8 (де-факто основной вариант,
// лучше распознаётся современными банковскими приложениями); "1" —
// устаревающий Windows-1251.
const PAYLOAD_HEADER = 'ST00012';
const FIELD_SEPARATOR = '|';

// Максимальные длины полей по таблице ГОСТ Р 56042-2014 — сверено с открытой
// реализацией github.com/kiraind/gost-r-56042-2014-js (research §5 источники
// дают только ссылку на PDF ГОСТа без цифр в явном виде, сам текст стандарта
// в рамках этой задачи не читался постранично).
// ponytail: цифры не выверены лично по официальному PDF — протестировать на
// реальном банковском приложении перед продом (тот же риск отмечен в самом
// research §5 для формата Sum в копейках).
const MAX_FIELD_LENGTH: Record<string, number> = {
  Name: 160,
  PersonalAcc: 20,
  BankName: 45,
  BIC: 9,
  CorrespAcc: 20,
  PayeeINN: 12,
  KPP: 9,
  Purpose: 210,
};

// `|` — разделитель полей формата: буквальный символ в значении сломал бы
// разбор строки сканером банка. Сам ГОСТ не описывает экранирование значений
// (открытые реализации, сверенные выше, тоже его не делают) — это защитный
// минимум сверх стандарта, а не его требование. Кавычки, `=`, кириллица —
// обычные символы для этого формата, не трогаем.
const sanitizeFieldValue = (value: string, fieldName: string): string => {
  const withoutSeparators = value.replace(/[|\r\n]/g, ' ').trim();
  const maxLength = MAX_FIELD_LENGTH[fieldName];

  return isDefined(maxLength)
    ? withoutSeparators.slice(0, maxLength)
    : withoutSeparators;
};

export type PaymentQrOrganizationRequisites = {
  name: string | null | undefined;
  settlementAccount: string | null | undefined;
  bankName: string | null | undefined;
  bik: string | null | undefined;
  corrAccount: string | null | undefined;
  inn: string | null | undefined;
  kpp: string | null | undefined;
};

// «Оплата по счёту № {number} от {date}» — Purpose-текст ST0001x; дата в
// коротком формате ДД.ММ.ГГГГ (как в примере ГОСТ, research §5), а не в
// длинном текстовом виде заголовка печатной формы.
export const buildPaymentQrPurpose = (
  invoiceNumberText: string,
  invoiceDateShort: string,
): string => {
  return `Оплата по счёту № ${invoiceNumberText} от ${invoiceDateShort}`;
};

// null — у организации нет полного набора ОБЯЗАТЕЛЬНЫХ реквизитов для
// распознавания как перевод по реквизитам (Name/PersonalAcc/BankName/BIC/
// CorrespAcc — research §5); печать счёта в этом случае просто пропускает
// блок QR — это не ошибка (ruling Task 7, Фаза 9). PayeeINN/KPP —
// «практически важные дополнительные» поля по research, не входят в гейт:
// включаются в payload, только если заполнены; KPP к тому же опционален у
// ИП по своей природе (organization.object.ts: `Пусто для ИП`).
export const buildPaymentQrPayload = (
  organization: PaymentQrOrganizationRequisites,
  purpose: string,
  sumKopecks: number,
): string | null => {
  const name = organization.name?.trim();
  const personalAcc = organization.settlementAccount?.trim();
  const bankName = organization.bankName?.trim();
  const bic = organization.bik?.trim();
  const correspAcc = organization.corrAccount?.trim();

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(personalAcc) ||
    !isNonEmptyString(bankName) ||
    !isNonEmptyString(bic) ||
    !isNonEmptyString(correspAcc)
  ) {
    return null;
  }

  const fields: [string, string][] = [
    ['Name', sanitizeFieldValue(name, 'Name')],
    ['PersonalAcc', sanitizeFieldValue(personalAcc, 'PersonalAcc')],
    ['BankName', sanitizeFieldValue(bankName, 'BankName')],
    ['BIC', sanitizeFieldValue(bic, 'BIC')],
    ['CorrespAcc', sanitizeFieldValue(correspAcc, 'CorrespAcc')],
  ];

  const inn = organization.inn?.trim();

  if (isNonEmptyString(inn)) {
    fields.push(['PayeeINN', sanitizeFieldValue(inn, 'PayeeINN')]);
  }

  // КПП опционален — у ИП его нет (research §5 / organization.object.ts).
  const kpp = organization.kpp?.trim();

  if (isNonEmptyString(kpp)) {
    fields.push(['KPP', sanitizeFieldValue(kpp, 'KPP')]);
  }

  fields.push(['Sum', String(Math.max(0, Math.round(sumKopecks)))]);
  fields.push(['Purpose', sanitizeFieldValue(purpose, 'Purpose')]);

  return [
    PAYLOAD_HEADER,
    ...fields.map(([key, value]) => `${key}=${value}`),
  ].join(FIELD_SEPARATOR);
};
