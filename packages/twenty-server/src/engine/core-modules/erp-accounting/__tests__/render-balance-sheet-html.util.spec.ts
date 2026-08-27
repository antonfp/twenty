import { type BalanceSheetLineValue } from 'src/engine/core-modules/erp-accounting/utils/compute-balance-sheet.util';
import { renderBalanceSheetHtml } from 'src/engine/core-modules/erp-accounting/utils/render-balance-sheet-html.util';
import { formatThousandRoublesRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const LINE_CODES = [
  '1150',
  '1170',
  '1210',
  '1250',
  '1230',
  '1370',
  '1410',
  '1450',
  '1510',
  '1520',
  '1550',
];

const zeroLines = (): BalanceSheetLineValue[] =>
  LINE_CODES.map((code) => ({
    code,
    label: code,
    group: code.startsWith('1') && Number(code) < 1300 ? 'ASSET' : 'LIABILITY',
    currentKopecks: 0,
    previousKopecks: 0,
  }));

const ZERO_TOTALS = {
  assetsCurrentKopecks: 0,
  assetsPreviousKopecks: 0,
  liabilitiesCurrentKopecks: 0,
  liabilitiesPreviousKopecks: 0,
};

describe('renderBalanceSheetHtml', () => {
  it('resolves every placeholder and prints the header/period', () => {
    const html = renderBalanceSheetHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7728168971',
      organizationKpp: '772801001',
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines: zeroLines(),
      totals: ZERO_TOTALS,
    });

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
    expect(html).toContain('ИНН 7728168971 КПП 772801001');
    expect(html).toContain('на 31.08.2026');
    expect(html).toContain('На 31.08.2026');
    expect(html).toContain('На 31.12.2025');
  });

  it('prints "—" for every zero cell, including the 1600/1700 totals', () => {
    const html = renderBalanceSheetHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '',
      organizationKpp: '',
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines: zeroLines(),
      totals: ZERO_TOTALS,
    });

    // 11 detail lines × 2 columns + 1600/1700 × 2 columns = 26 dash cells.
    const dashCells = html.match(/<td class="c-amt">—<\/td>/g) ?? [];

    expect(dashCells).toHaveLength(26);
  });

  it('renders a non-zero line and matching totals with formatThousandRoublesRu, actив=пассив equal', () => {
    const lines = zeroLines().map((line) =>
      line.code === '1250' ? { ...line, currentKopecks: 622_000 } : line,
    );

    const html = renderBalanceSheetHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7728168971',
      organizationKpp: '772801001',
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines,
      totals: {
        assetsCurrentKopecks: 622_000,
        assetsPreviousKopecks: 0,
        liabilitiesCurrentKopecks: 622_000,
        liabilitiesPreviousKopecks: 0,
      },
    });

    const cellHtml = `<td class="c-amt">${formatThousandRoublesRu(622_000)}</td>`;
    // 1250 (622 000 коп. = 6 220,00 руб = 6,22 тыс. → «6») + 1600 + 1700, all
    // the same rounded figure — appears 3 times.
    const matches = html.split(cellHtml).length - 1;

    expect(matches).toBe(3);
    expect(formatThousandRoublesRu(622_000)).toBe('6');
  });

  it('prints "—" for a nonzero amount that rounds down to 0 тыс.руб. (review Finding 1: 400 руб must not print "0")', () => {
    const lines = zeroLines().map(
      (line) =>
        line.code === '1170' ? { ...line, currentKopecks: 40_000 } : line, // 400,00 руб = 0,4 тыс.
    );

    const html = renderBalanceSheetHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '',
      organizationKpp: '',
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines,
      totals: {
        ...ZERO_TOTALS,
        assetsCurrentKopecks: 40_000, // same boundary on the 1600 total row
      },
    });

    expect(html).not.toContain('<td class="c-amt">0</td>');
    // Every cell that should be a dash still is one: the 1170/1600 boundary
    // cells round to 0 and print «—» exactly like the true-zero cells, so
    // the count is unchanged from the all-zero case (26).
    const dashCells = html.match(/<td class="c-amt">—<\/td>/g) ?? [];

    expect(dashCells).toHaveLength(26);
  });

  it('escapes HTML-significant characters in the organization name', () => {
    const html = renderBalanceSheetHtml({
      organizationName: 'ООО "Хитрость" <script>alert(1)</script> & Co',
      organizationInn: '',
      organizationKpp: '',
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines: zeroLines(),
      totals: ZERO_TOTALS,
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain(
      'ООО &quot;Хитрость&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co',
    );
  });
});
