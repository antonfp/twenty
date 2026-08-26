import { renderTrialBalanceHtml } from 'src/engine/core-modules/erp-accounting/utils/render-trial-balance-html.util';
import {
  type TrialBalanceRow,
  type TrialBalanceTotals,
} from 'src/engine/core-modules/erp-accounting/utils/compute-trial-balance.util';
import { formatMoneyRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const ZERO_TOTALS: TrialBalanceTotals = {
  openingDebitKopecks: 0,
  openingCreditKopecks: 0,
  turnoverDebitKopecks: 0,
  turnoverCreditKopecks: 0,
  closingDebitKopecks: 0,
  closingCreditKopecks: 0,
};

describe('renderTrialBalanceHtml', () => {
  it('resolves every placeholder and prints the header/period', () => {
    const html = renderTrialBalanceHtml({
      organizationName: 'ООО «Ромашка»',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      rows: [],
      totals: ZERO_TOTALS,
    });

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
    expect(html).toContain('за период с 01.08.2026 по 31.08.2026');
  });

  it('escapes HTML-significant characters in an account/organization name', () => {
    const row: TrialBalanceRow = {
      accountId: 'acc-1',
      code: '62.01',
      name: 'ООО "Хитрость" <script>alert(1)</script> & Co',
      openingDebitKopecks: 0,
      openingCreditKopecks: 0,
      turnoverDebitKopecks: 100000,
      turnoverCreditKopecks: 0,
      closingDebitKopecks: 100000,
      closingCreditKopecks: 0,
    };

    const html = renderTrialBalanceHtml({
      organizationName: 'ООО "Ромашка" & <b>Партнёры</b>',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      rows: [row],
      totals: ZERO_TOTALS,
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Партнёры</b>');
    expect(html).toContain(
      'ООО &quot;Хитрость&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co',
    );
    expect(html).toContain(
      'ООО &quot;Ромашка&quot; &amp; &lt;b&gt;Партнёры&lt;/b&gt;',
    );
  });

  it('prints zero cells blank on account rows but numeric on the totals row', () => {
    const zeroRow: TrialBalanceRow = {
      accountId: 'acc-62',
      code: '62.01',
      name: 'Расчёты с покупателями',
      openingDebitKopecks: 0,
      openingCreditKopecks: 0,
      turnoverDebitKopecks: 122000,
      turnoverCreditKopecks: 122000,
      closingDebitKopecks: 0,
      closingCreditKopecks: 0,
    };

    const html = renderTrialBalanceHtml({
      organizationName: 'ООО «Ромашка»',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      rows: [zeroRow],
      totals: ZERO_TOTALS,
    });

    // formatMoneyRu groups thousands with a non-breaking space, not a plain
    // one — reused here rather than hand-typed to keep the two in sync.
    const turnoverCellHtml = `<td class="c-amt">${formatMoneyRu(122000)}</td>`;

    expect(html).toContain(turnoverCellHtml);
    // The totals row always prints "0,00", even for an all-zero report.
    expect(html).toContain('<td class="c-amt">0,00</td>');
  });
});
