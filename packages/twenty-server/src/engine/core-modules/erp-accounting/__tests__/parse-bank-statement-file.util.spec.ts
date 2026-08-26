import { encodeCp1251 } from 'src/engine/core-modules/erp-accounting/utils/decode-cp1251.util';
import {
  decodeBankStatementBuffer,
  parseBankStatementText,
} from 'src/engine/core-modules/erp-accounting/utils/parse-bank-statement-file.util';

// Two Платёжное поручение documents (one incoming to 7706123456, one
// outgoing from it) plus a garbage line with no "=" sitting between them,
// matching the researched 1CClientBankExchange structure (v8.1c.ru): header
// marker, ВерсияФормата/Кодировка/РасчСчет, then
// СекцияДокумент=Платежное поручение...КонецДокумента blocks, КонецФайла.
const buildFixtureText = (encodingLabel: string): string => `1CClientBankExchange
ВерсияФормата=1.03
Кодировка=${encodingLabel}
Отправитель=Банк
Получатель=1С
ДатаНачала=01.08.2026
ДатаКонца=25.08.2026
РасчСчет=40702810000000000123
СекцияДокумент=Платежное поручение
Номер=15
Дата=20.08.2026
Сумма=118000.00
ПлательщикСчет=40702810900000012345
ПлательщикИНН=7712345678
Плательщик1=ООО "Ромашка"
ПолучательСчет=40702810100000054321
ПолучательИНН=7706123456
Получатель1=ООО "Наша Организация"
ДатаПоступило=21.08.2026
НазначениеПлатежа=Оплата по счёту № 10 от 15.08.2026 за товар
КонецДокумента
### мусорная строка без знака равенства ###
СекцияДокумент=Платежное поручение
Номер=16
Дата=21.08.2026
Сумма=54000
ПлательщикСчет=40702810100000054321
ПлательщикИНН=7706123456
Плательщик1=ООО "Наша Организация"
ПолучательСчет=40702810900000099999
ПолучательИНН=5001234567
Получатель1=ООО "Поставщик"
ДатаСписано=21.08.2026
НазначениеПлатежа=Оплата по счёту № 5 от 18.08.2026
КонецДокумента
КонецФайла
`;

describe('decodeBankStatementBuffer + parseBankStatementText', () => {
  it('parses a windows-1251-encoded file into two documents, skipping the garbage line', () => {
    const buffer = encodeCp1251(buildFixtureText('Windows'));
    const text = decodeBankStatementBuffer(buffer);
    const { documents, fileErrors } = parseBankStatementText(text);

    expect(fileErrors).toEqual([]);
    expect(documents).toHaveLength(2);
    expect(documents[0]).toMatchObject({
      documentType: 'Платежное поручение',
      number: '15',
      dateIso: '2026-08-20',
      amountKopecks: 11_800_000,
      payerInn: '7712345678',
      payerName: 'ООО "Ромашка"',
      payeeInn: '7706123456',
      payeeName: 'ООО "Наша Организация"',
      dateReceivedIso: '2026-08-21',
      dateWrittenOffIso: null,
      parseError: null,
    });
    expect(documents[1]).toMatchObject({
      number: '16',
      amountKopecks: 5_400_000,
      payerInn: '7706123456',
      payeeInn: '5001234567',
      dateReceivedIso: null,
      dateWrittenOffIso: '2026-08-21',
      parseError: null,
    });
  });

  it('parses the same content when the file declares Кодировка=UTF-8', () => {
    const buffer = Buffer.from(buildFixtureText('UTF-8'), 'utf-8');
    const text = decodeBankStatementBuffer(buffer);
    const { documents } = parseBankStatementText(text);

    expect(documents).toHaveLength(2);
    expect(documents[0].payerName).toBe('ООО "Ромашка"');
  });

  it('prefers a UTF-8 BOM over a windows-1251-suggesting Кодировка header', () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    // Кодировка says Windows, but the bytes after the BOM are real UTF-8 —
    // the BOM must win, or this would come out garbled.
    const buffer = Buffer.concat([
      bom,
      Buffer.from(buildFixtureText('Windows'), 'utf-8'),
    ]);
    const text = decodeBankStatementBuffer(buffer);
    const { documents } = parseBankStatementText(text);

    expect(documents).toHaveLength(2);
    expect(documents[0].payerName).toBe('ООО "Ромашка"');
  });

  it('reports one RU error for a file with no recognisable structure, without throwing', () => {
    const { documents, fileErrors } = parseBankStatementText(
      'это случайный текст\nбез каких-либо секций формата',
    );

    expect(documents).toEqual([]);
    expect(fileErrors).toHaveLength(1);
    expect(fileErrors[0]).toContain('1CClientBankExchange');
  });

  it('flags a document with an unparseable amount instead of dropping the whole file', () => {
    const text = [
      '1CClientBankExchange',
      'СекцияДокумент=Платежное поручение',
      'Номер=1',
      'Дата=01.08.2026',
      'Сумма=not-a-number',
      'КонецДокумента',
      'КонецФайла',
    ].join('\n');

    const { documents, fileErrors } = parseBankStatementText(text);

    expect(fileErrors).toEqual([]);
    expect(documents).toHaveLength(1);
    expect(documents[0].parseError).toContain('Сумма');
    expect(documents[0].amountKopecks).toBeNull();
  });
});
