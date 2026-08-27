// Comparative-column dates for Баланс/ОФР (plan.md ruling: «графы «На
// отчётную дату / На 31.12 предыдущего года» — предыдущий период считать
// тем же сервисом»). That phrasing is literally correct for a balance (a
// сальдо-на-дату figure), so the balance sheet's comparative date is a fixed
// 31 December of the prior year. It doesn't translate literally to an ОФР
// (a turnover-over-a-period figure has no «сальдо на 31.12» analogue) — the
// natural adaptation, documented in ofr-spec.md, is the SAME date range
// shifted one calendar year back, still computed by calling the identical
// service with different dates.

// «На 31.12 предыдущего года» — balance-sheet.service.ts's comparative date.
export const previousYearEndDate = (isoDate: string): string => {
  const year = Number(isoDate.slice(0, 4));

  return `${year - 1}-12-31`;
};

// Same month/day, one year earlier; 29 Feb has no equivalent in a non-leap
// target year — clamped to 28 Feb (documented simplification, ofr-spec.md).
const shiftDateByOneYear = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const targetYear = year - 1;
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, month, 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  return `${targetYear}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
};

// income-statement.service.ts's comparative period: «тот же период
// предыдущего года».
export const previousYearPeriod = (
  dateFrom: string,
  dateTo: string,
): { dateFrom: string; dateTo: string } => ({
  dateFrom: shiftDateByOneYear(dateFrom),
  dateTo: shiftDateByOneYear(dateTo),
});
