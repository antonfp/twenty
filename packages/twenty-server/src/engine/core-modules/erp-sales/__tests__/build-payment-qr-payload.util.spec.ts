import {
  buildPaymentQrPayload,
  buildPaymentQrPurpose,
  type PaymentQrOrganizationRequisites,
} from 'src/engine/core-modules/erp-sales/utils/build-payment-qr-payload.util';

// Полный набор обязательных + практически важных реквизитов (research §5) —
// пример близок к образцу из ГОСТ Р 56042-2014, но собран независимо от
// build-payment-qr-payload.util.ts, чтобы эталонный тест ниже реально
// проверял формат, а не сравнивал функцию саму с собой.
const FULL_ORG: PaymentQrOrganizationRequisites = {
  name: 'ООО «Ромашка»',
  settlementAccount: '40702810900000012345',
  bankName: 'ПАО СБЕРБАНК',
  bik: '044525225',
  corrAccount: '30101810400000000225',
  inn: '7700000000',
  kpp: '770001001',
};

describe('buildPaymentQrPurpose', () => {
  it('builds «Оплата по счёту № {number} от {date}»', () => {
    expect(buildPaymentQrPurpose('42', '26.08.2026')).toBe(
      'Оплата по счёту № 42 от 26.08.2026',
    );
  });
});

describe('buildPaymentQrPayload', () => {
  it('matches a hand-built reference ST00012 payload (ГОСТ Р 56042-2014)', () => {
    const purpose = buildPaymentQrPurpose('15', '01.09.2026');

    // 150 000,00 руб = 15 000 000 коп — Sum должен быть в копейках, не в рублях.
    const payload = buildPaymentQrPayload(FULL_ORG, purpose, 15_000_000);

    expect(payload).toBe(
      'ST00012|Name=ООО «Ромашка»|PersonalAcc=40702810900000012345' +
        '|BankName=ПАО СБЕРБАНК|BIC=044525225|CorrespAcc=30101810400000000225' +
        '|PayeeINN=7700000000|KPP=770001001|Sum=15000000' +
        '|Purpose=Оплата по счёту № 15 от 01.09.2026',
    );
  });

  it('encodes Sum in integer kopecks, not roubles', () => {
    // 1 234,56 руб -> 123456 коп.
    const payload = buildPaymentQrPayload(FULL_ORG, 'Оплата', 123_456);

    expect(payload).toContain('Sum=123456');
  });

  it('rounds a fractional kopeck sum to the nearest whole kopeck', () => {
    const payload = buildPaymentQrPayload(FULL_ORG, 'Оплата', 100.6);

    expect(payload).toContain('Sum=101');
  });

  it('returns null when any required requisite is missing (Name/PersonalAcc/BankName/BIC/CorrespAcc)', () => {
    expect(
      buildPaymentQrPayload({ ...FULL_ORG, bankName: '' }, 'Оплата', 100),
    ).toBeNull();
    expect(
      buildPaymentQrPayload(
        { ...FULL_ORG, settlementAccount: undefined },
        'Оплата',
        100,
      ),
    ).toBeNull();
    expect(
      buildPaymentQrPayload({ ...FULL_ORG, name: null }, 'Оплата', 100),
    ).toBeNull();
    expect(
      buildPaymentQrPayload({ ...FULL_ORG, bik: '   ' }, 'Оплата', 100), // whitespace-only -> not a real value
    ).toBeNull();
  });

  it('omits KPP when absent (ИП has none) but keeps the rest of the payload valid', () => {
    const payload = buildPaymentQrPayload(
      { ...FULL_ORG, kpp: null },
      'Оплата',
      100,
    );

    expect(payload).not.toContain('KPP=');
    expect(payload).toContain('PayeeINN=7700000000');
  });

  it('omits PayeeINN when the organization has none — the gate stays on the 5 GOST-required fields only', () => {
    const payload = buildPaymentQrPayload(
      { ...FULL_ORG, inn: '' },
      'Оплата',
      100,
    );

    expect(payload).not.toBeNull();
    expect(payload).not.toContain('PayeeINN=');
  });

  it('strips a literal "|" field-separator character from a value instead of corrupting the field count', () => {
    const payload = buildPaymentQrPayload(
      { ...FULL_ORG, name: 'ООО "Ромашка"|Доп.офис' },
      'Оплата',
      100,
    );
    const segments = payload?.split('|') ?? [];

    // header + Name/PersonalAcc/BankName/BIC/CorrespAcc/PayeeINN/KPP/Sum/Purpose = 10.
    expect(segments).toHaveLength(10);
    expect(segments[1]).toBe('Name=ООО "Ромашка" Доп.офис');
  });

  // Кавычки в номере счёта — обычные символы для ST0001x (не `|`), поэтому
  // экранирования в самом payload не требуется; HTML-экранирование значения
  // при вставке в атрибут alt="" печатной формы проверяется отдельно, в
  // sales-invoice-print.service.spec.ts.
  it('passes quote characters in the invoice number through into Purpose unescaped', () => {
    const purpose = buildPaymentQrPurpose('15"тест"', '01.09.2026');
    const payload = buildPaymentQrPayload(FULL_ORG, purpose, 100);

    expect(payload).toContain(
      'Purpose=Оплата по счёту № 15"тест" от 01.09.2026',
    );
  });

  it('truncates an over-length Name to the GOST field limit (160 chars) instead of an invalid field', () => {
    const longName = 'О'.repeat(200);
    const payload = buildPaymentQrPayload(
      { ...FULL_ORG, name: longName },
      'Оплата',
      100,
    );
    const nameField = payload
      ?.split('|')
      .find((field) => field.startsWith('Name='));

    expect(nameField?.slice('Name='.length)).toHaveLength(160);
  });
});
