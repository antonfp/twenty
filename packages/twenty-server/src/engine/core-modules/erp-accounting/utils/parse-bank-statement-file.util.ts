import { decodeCp1251 } from 'src/engine/core-modules/erp-accounting/utils/decode-cp1251.util';

// 1CClientBankExchange (v8.1c.ru «Стандарт обмена с системами Клиент-банк»,
// v1.02/1.03): file starts with the literal marker line "1CClientBankExchange",
// then header keys (ВерсияФормата, Кодировка, ...), then zero or more
// "СекцияДокумент=<тип>" ... "КонецДокумента" blocks, then "КонецФайла".
const FORMAT_HEADER_MARKER = '1CClientBankExchange';
const SECTION_DOCUMENT_PREFIX = 'СекцияДокумент=';
const END_OF_DOCUMENT_MARKER = 'КонецДокумента';
const END_OF_FILE_MARKER = 'КонецФайла';
const DOCUMENT_TYPE_PAYMENT_ORDER = 'Платежное поручение';
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export type ParsedBankStatementDocument = {
  documentType: string;
  // Always populated ('без номера' as a last resort) so error/skip/comment
  // messages always have something to reference the row by.
  number: string;
  dateIso: string | null;
  amountKopecks: number | null;
  payerInn: string | null;
  payerName: string;
  payeeInn: string | null;
  payeeName: string;
  purpose: string;
  dateReceivedIso: string | null;
  dateWrittenOffIso: string | null;
  // Non-null means dateIso/amountKopecks may be null — callers must check
  // this before reading either as non-null.
  parseError: string | null;
};

export type ParsedBankStatementFile = {
  documents: ParsedBankStatementDocument[];
  fileErrors: string[];
};

// Files are windows-1251 by default per the 1CClientBankExchange spec; a
// UTF-8 BOM or an explicit "Кодировка=UTF-8" header line overrides that.
// The "Кодировка" key itself is Cyrillic, so it decodes differently under
// each encoding and can't be matched textually before the encoding is known
// — but the value "UTF-8" is pure ASCII, which is byte-identical whether the
// surrounding text is CP1251 or UTF-8, so a raw byte-level scan for it in
// the header region is decode-order-independent.
const UTF8_DECLARATION_PATTERN = /=\s*UTF-?8\b/i;
const HEADER_SCAN_BYTES = 1024;

export const decodeBankStatementBuffer = (buffer: Buffer): string => {
  if (buffer.subarray(0, 3).equals(UTF8_BOM)) {
    return buffer.subarray(3).toString('utf-8');
  }

  const headerRegion = buffer
    .subarray(0, Math.min(buffer.length, HEADER_SCAN_BYTES))
    .toString('latin1');

  if (UTF8_DECLARATION_PATTERN.test(headerRegion)) {
    return buffer.toString('utf-8');
  }

  return decodeCp1251(buffer);
};

// Сумма is «руб[.коп]», a plain decimal string — parsed via string split so
// no float ever touches a money value (банковские суммы точные).
const parseAmountToKopecks = (raw: string): number | null => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw.trim());

  if (!match) {
    return null;
  }

  const kopecksFraction = (match[2] ?? '00').padEnd(2, '0');

  return Number(match[1]) * 100 + Number(kopecksFraction);
};

// Round-trips through Date.UTC to reject a syntactically valid but impossible
// calendar date (e.g. 30.02.2026) — same technique as
// trial-balance.controller.ts's isValidCalendarDate.
const convertRuDateToIso = (raw: string): string | null => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw.trim());

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

const normalizeInn = (raw: string | undefined): string | null => {
  const trimmed = raw?.trim();

  return trimmed ? trimmed : null;
};

const buildDocument = (
  documentType: string,
  fields: Record<string, string>,
): ParsedBankStatementDocument => {
  const rawNumber = fields['Номер']?.trim();
  const number = rawNumber ? rawNumber : 'без номера';
  const errors: string[] = [];

  if (!rawNumber) {
    errors.push('отсутствует номер документа (Номер)');
  }

  const dateIso = fields['Дата'] ? convertRuDateToIso(fields['Дата']) : null;

  if (!dateIso) {
    errors.push('некорректная или отсутствующая дата документа (Дата)');
  }

  const amountKopecks = fields['Сумма']
    ? parseAmountToKopecks(fields['Сумма'])
    : null;

  if (amountKopecks === null) {
    errors.push('некорректная или отсутствующая сумма документа (Сумма)');
  }

  return {
    documentType,
    number,
    dateIso,
    amountKopecks,
    payerInn: normalizeInn(fields['ПлательщикИНН']),
    payerName: fields['Плательщик1'] ?? fields['Плательщик'] ?? '',
    payeeInn: normalizeInn(fields['ПолучательИНН']),
    payeeName: fields['Получатель1'] ?? fields['Получатель'] ?? '',
    purpose: fields['НазначениеПлатежа'] ?? '',
    dateReceivedIso: fields['ДатаПоступило']
      ? convertRuDateToIso(fields['ДатаПоступило'])
      : null,
    dateWrittenOffIso: fields['ДатаСписано']
      ? convertRuDateToIso(fields['ДатаСписано'])
      : null,
    parseError: errors.length > 0 ? errors.join('; ') : null,
  };
};

// Line-by-line, garbage-resilient: only the 1CClientBankExchange marker,
// СекцияДокумент=Платежное поручение...КонецДокумента blocks and КонецФайла
// are recognised — anything else (header keys outside a document, other
// document types, blank lines, a corrupted line) is silently ignored rather
// than aborting the whole import.
export const parseBankStatementText = (
  text: string,
): ParsedBankStatementFile => {
  const documents: ParsedBankStatementDocument[] = [];
  let hasHeaderMarker = false;
  let currentType: string | null = null;
  let currentFields: Record<string, string> | null = null;

  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (trimmed === FORMAT_HEADER_MARKER) {
      hasHeaderMarker = true;
      continue;
    }

    if (trimmed.startsWith(SECTION_DOCUMENT_PREFIX)) {
      currentType = trimmed.slice(SECTION_DOCUMENT_PREFIX.length).trim();
      currentFields = currentType === DOCUMENT_TYPE_PAYMENT_ORDER ? {} : null;
      continue;
    }

    if (trimmed === END_OF_DOCUMENT_MARKER) {
      if (currentFields !== null && currentType !== null) {
        documents.push(buildDocument(currentType, currentFields));
      }
      currentType = null;
      currentFields = null;
      continue;
    }

    if (trimmed === END_OF_FILE_MARKER) {
      continue;
    }

    if (currentFields !== null) {
      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex > 0) {
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        currentFields[key] = value;
      }
      // A line inside a document block with no '=' is garbage; skip it.
    }
    // A line outside any document block that isn't a recognised marker
    // (header keys, an unsupported document type's body, true garbage) is
    // not needed for import logic; skip it.
  }

  const fileErrors: string[] =
    !hasHeaderMarker && documents.length === 0
      ? [
          'Файл не распознан как выписка формата 1CClientBankExchange: отсутствует признак формата и не найдено ни одного документа.',
        ]
      : [];

  return { documents, fileErrors };
};
