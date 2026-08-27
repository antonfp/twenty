import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';
import { AccountKind } from '../objects/account.object';

// Рабочий план счетов РСБУ (Phase 6 Task 1 brief, +90.09/91.09 Phase 9 Task 5
// «Закрытие месяца» — subaccounts holding the monthly/yearly closing result)
// — 32 счёта/субсчёта.
const ACCOUNTS: Array<{ code: string; kind: AccountKind; name: string }> = [
  { code: '01', kind: AccountKind.ACTIVE, name: 'Основные средства' },
  { code: '02', kind: AccountKind.PASSIVE, name: 'Амортизация ОС' },
  { code: '04', kind: AccountKind.ACTIVE, name: 'НМА' },
  { code: '08', kind: AccountKind.ACTIVE, name: 'Вложения во внеоборотные активы' },
  { code: '10', kind: AccountKind.ACTIVE, name: 'Материалы' },
  { code: '19.04', kind: AccountKind.ACTIVE, name: 'НДС по приобретённым услугам' },
  { code: '20', kind: AccountKind.ACTIVE, name: 'Основное производство' },
  { code: '26', kind: AccountKind.ACTIVE, name: 'Общехозяйственные расходы' },
  { code: '41.01', kind: AccountKind.ACTIVE, name: 'Товары на складах' },
  { code: '44', kind: AccountKind.ACTIVE, name: 'Расходы на продажу' },
  { code: '50', kind: AccountKind.ACTIVE, name: 'Касса' },
  { code: '51', kind: AccountKind.ACTIVE, name: 'Расчётные счета' },
  { code: '60.01', kind: AccountKind.ACTIVE_PASSIVE, name: 'Расчёты с поставщиками' },
  { code: '62.01', kind: AccountKind.ACTIVE_PASSIVE, name: 'Расчёты с покупателями' },
  { code: '68.01', kind: AccountKind.ACTIVE_PASSIVE, name: 'НДФЛ' },
  { code: '68.02', kind: AccountKind.ACTIVE_PASSIVE, name: 'НДС' },
  { code: '69', kind: AccountKind.ACTIVE_PASSIVE, name: 'Страховые взносы' },
  { code: '70', kind: AccountKind.PASSIVE, name: 'Расчёты по оплате труда' },
  { code: '71', kind: AccountKind.ACTIVE_PASSIVE, name: 'Подотчётные лица' },
  { code: '75', kind: AccountKind.ACTIVE_PASSIVE, name: 'Расчёты с учредителями' },
  { code: '76', kind: AccountKind.ACTIVE_PASSIVE, name: 'Прочие дебиторы и кредиторы' },
  { code: '80', kind: AccountKind.PASSIVE, name: 'Уставный капитал' },
  { code: '84', kind: AccountKind.ACTIVE_PASSIVE, name: 'Нераспределённая прибыль' },
  { code: '90.01.1', kind: AccountKind.PASSIVE, name: 'Выручка' },
  { code: '90.02.1', kind: AccountKind.ACTIVE, name: 'Себестоимость продаж' },
  { code: '90.03', kind: AccountKind.ACTIVE, name: 'НДС с продаж' },
  { code: '90.09', kind: AccountKind.ACTIVE_PASSIVE, name: 'Прибыль/убыток от продаж' },
  { code: '91.01', kind: AccountKind.PASSIVE, name: 'Прочие доходы' },
  { code: '91.02', kind: AccountKind.ACTIVE, name: 'Прочие расходы' },
  { code: '91.09', kind: AccountKind.ACTIVE_PASSIVE, name: 'Сальдо прочих доходов и расходов' },
  { code: '94', kind: AccountKind.ACTIVE, name: 'Недостачи и потери' },
  { code: '99', kind: AccountKind.ACTIVE_PASSIVE, name: 'Прибыли и убытки' },
];

// Idempotent: re-running the install (or executing the function manually)
// must not duplicate seed records — diffed against existing codes, not
// re-run per record, so this stays a single query + single bulk mutation.
const handler = async () => {
  const client = new CoreApiClient();

  const existingAccounts = (await client.query({
    accounts: {
      __args: { first: 200 } as any,
      edges: { node: { code: true } },
    },
  } as any)) as any;

  const existingCodes = new Set<string>(
    (existingAccounts?.accounts?.edges ?? []).map((edge: any) => edge.node.code),
  );

  const missingAccounts = ACCOUNTS.filter((account) => !existingCodes.has(account.code));

  if (missingAccounts.length > 0) {
    await client.mutation({
      createAccounts: {
        __args: { data: missingAccounts as any },
        id: true,
      },
    } as any);
    console.log(`Seeded ${missingAccounts.length} account(s) of the ${ACCOUNTS.length}-account chart.`);
  }

  return {};
};

export default definePostInstallLogicFunction({
  universalIdentifier: '2b5e8614-6401-40f7-9018-0ab3d127ba63',
  name: 'post-install',
  description:
    'Заполняет рабочий план счетов РСБУ (30 счетов/субсчетов, идемпотентно по коду).',
  timeoutSeconds: 60,
  shouldRunSynchronously: true,
  handler,
});
