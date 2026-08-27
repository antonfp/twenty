import { type IncomeStatementLineValue } from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';
import { renderIncomeStatementHtml } from 'src/engine/core-modules/erp-accounting/utils/render-income-statement-html.util';
import { formatThousandRoublesRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const LINE_CODES = [
  '2110',
  '2120',
  '2330',
  '2340',
  '2350',
  '2410',
  '2300',
  '2400',
];

const zeroLines = (): IncomeStatementLineValue[] =>
  LINE_CODES.map((code) => ({
    code,
    label: code,
    currentKopecks: 0,
    previousKopecks: 0,
  }));

describe('renderIncomeStatementHtml', () => {
  it('resolves every placeholder and prints the header/period', () => {
    const html = renderIncomeStatementHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7728168971',
      organizationKpp: '772801001',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      previousDateFrom: '2025-08-01',
      previousDateTo: '2025-08-31',
      lines: zeroLines(),
    });

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
    expect(html).toContain('с 01.08.2026 по 31.08.2026');
    expect(html).toContain('01.08.2026 — 31.08.2026');
    expect(html).toContain('01.08.2025 — 31.08.2025');
  });

  it('prints "—" for every zero cell, including 2300/2400', () => {
    const html = renderIncomeStatementHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '',
      organizationKpp: '',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      previousDateFrom: '2025-08-01',
      previousDateTo: '2025-08-31',
      lines: zeroLines(),
    });

    const dashCells = html.match(/<td class="c-amt">—<\/td>/g) ?? [];

    expect(dashCells).toHaveLength(16); // 8 lines × 2 columns
  });

  it('formats a non-zero revenue line with formatThousandRoublesRu', () => {
    const lines = zeroLines().map((line) =>
      line.code === '2110' ? { ...line, currentKopecks: 100_000 } : line,
    );

    const html = renderIncomeStatementHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '',
      organizationKpp: '',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      previousDateFrom: '2025-08-01',
      previousDateTo: '2025-08-31',
      lines,
    });

    expect(formatThousandRoublesRu(100_000)).toBe('1');
    expect(html).toContain(
      `<td class="c-amt">${formatThousandRoublesRu(100_000)}</td>`,
    );
  });
});
