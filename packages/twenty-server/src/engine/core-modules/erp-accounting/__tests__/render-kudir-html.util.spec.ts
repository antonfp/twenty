import { type KudirEntry } from 'src/engine/core-modules/erp-accounting/utils/compute-kudir.util';
import { renderKudirHtml } from 'src/engine/core-modules/erp-accounting/utils/render-kudir-html.util';
import { formatWholeRublesRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const movementEntry = (overrides: Partial<KudirEntry> = {}): KudirEntry => ({
  seq: 1,
  date: '2026-01-15',
  documentLabel: 'Поступление оплаты № PAY-000001 от 15.01.2026',
  content: 'Оплата по счёту № SI-000001 от 10.01.2026, ООО Ромашка',
  incomeKopecks: 122_000,
  expenseKopecks: 0,
  ...overrides,
});

const totalRow = (overrides: Partial<KudirEntry> = {}): KudirEntry => ({
  seq: null,
  date: null,
  documentLabel: null,
  content: 'Итого за I квартал',
  incomeKopecks: 122_000,
  expenseKopecks: 0,
  ...overrides,
});

describe('renderKudirHtml', () => {
  it('resolves every placeholder and prints the title page', () => {
    const html = renderKudirHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [movementEntry(), totalRow()],
      totalIncomeKopecks: 122_000,
      totalExpenseKopecks: 0,
    });

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
    expect(html).toContain('7712345678');
    expect(html).toContain('за 2026 год');
    expect(html).toContain('Доходы');
  });

  it('prints a zero income/expense cell blank on both movement and total rows', () => {
    const html = renderKudirHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [
        movementEntry({ expenseKopecks: 0 }),
        totalRow({ expenseKopecks: 0 }),
      ],
      totalIncomeKopecks: 122_000,
      totalExpenseKopecks: 0,
    });

    // Non-zero income cell prints a value — reused formatter, not
    // hand-typed, to keep the NBSP grouping in sync (same technique as
    // render-trial-balance-html.util.spec.ts).
    const incomeCellHtml = `<td class="c-amt">${formatWholeRublesRu(122_000)}</td>`;

    expect(html).toContain(incomeCellHtml);
    // Zero expense cell (both rows) renders blank, not "0".
    const expenseCellMatches = html.match(/<td class="c-amt"><\/td>/g) ?? [];

    expect(expenseCellMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('marks a cumulative-total row with the total-row class and a blank seq', () => {
    const html = renderKudirHtml({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [totalRow()],
      totalIncomeKopecks: 122_000,
      totalExpenseKopecks: 0,
    });

    expect(html).toContain('<tr class="total-row">');
    expect(html).toContain('<td class="c-num"></td>');
    expect(html).toContain('Итого за I квартал');
  });

  it('escapes HTML-significant characters in organization/content', () => {
    const html = renderKudirHtml({
      organizationName: 'ООО "Хитрость" <script>alert(1)</script> & Co',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [
        movementEntry({
          content: 'Оплата <b>тест</b> & "кавычки"',
        }),
      ],
      totalIncomeKopecks: 122_000,
      totalExpenseKopecks: 0,
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>тест</b>');
    expect(html).toContain(
      'ООО &quot;Хитрость&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co',
    );
    expect(html).toContain(
      'Оплата &lt;b&gt;тест&lt;/b&gt; &amp; &quot;кавычки&quot;',
    );
  });
});
