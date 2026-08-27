import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';
import { AccountKind } from '../objects/account.object';

// Дашборд «ERP-сводка» (Phase 9 Task 9) — фиксированный id для идемпотентного
// upsert (dashboard — объект данных, не метаданные: SDK apply не может его
// создать декларативно, только page-layout с виджетами, которые он показывает).
const ERP_SUMMARY_DASHBOARD_ID = '9a2f5c31-7e5d-4a8b-9c2e-3d4a5b6c7d8e';
const ERP_SUMMARY_DASHBOARD_NAME = 'ERP-сводка';

// Рабочий план счетов РСБУ (Phase 6 Task 1 brief, +90.09/91.09 Phase 9 Task 5
// «Закрытие месяца» — subaccounts holding the monthly/yearly closing result)
// — 32 счёта/субсчёта.
const ACCOUNTS: Array<{ code: string; kind: AccountKind; name: string }> = [
  { code: '01', kind: AccountKind.ACTIVE, name: 'Основные средства' },
  { code: '02', kind: AccountKind.PASSIVE, name: 'Амортизация ОС' },
  { code: '04', kind: AccountKind.ACTIVE, name: 'НМА' },
  {
    code: '08',
    kind: AccountKind.ACTIVE,
    name: 'Вложения во внеоборотные активы',
  },
  { code: '10', kind: AccountKind.ACTIVE, name: 'Материалы' },
  {
    code: '19.04',
    kind: AccountKind.ACTIVE,
    name: 'НДС по приобретённым услугам',
  },
  { code: '20', kind: AccountKind.ACTIVE, name: 'Основное производство' },
  { code: '26', kind: AccountKind.ACTIVE, name: 'Общехозяйственные расходы' },
  { code: '41.01', kind: AccountKind.ACTIVE, name: 'Товары на складах' },
  { code: '44', kind: AccountKind.ACTIVE, name: 'Расходы на продажу' },
  { code: '50', kind: AccountKind.ACTIVE, name: 'Касса' },
  { code: '51', kind: AccountKind.ACTIVE, name: 'Расчётные счета' },
  {
    code: '60.01',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Расчёты с поставщиками',
  },
  {
    code: '62.01',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Расчёты с покупателями',
  },
  { code: '68.01', kind: AccountKind.ACTIVE_PASSIVE, name: 'НДФЛ' },
  { code: '68.02', kind: AccountKind.ACTIVE_PASSIVE, name: 'НДС' },
  { code: '69', kind: AccountKind.ACTIVE_PASSIVE, name: 'Страховые взносы' },
  { code: '70', kind: AccountKind.PASSIVE, name: 'Расчёты по оплате труда' },
  { code: '71', kind: AccountKind.ACTIVE_PASSIVE, name: 'Подотчётные лица' },
  {
    code: '75',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Расчёты с учредителями',
  },
  {
    code: '76',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Прочие дебиторы и кредиторы',
  },
  { code: '80', kind: AccountKind.PASSIVE, name: 'Уставный капитал' },
  {
    code: '84',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Нераспределённая прибыль',
  },
  { code: '90.01.1', kind: AccountKind.PASSIVE, name: 'Выручка' },
  { code: '90.02.1', kind: AccountKind.ACTIVE, name: 'Себестоимость продаж' },
  { code: '90.03', kind: AccountKind.ACTIVE, name: 'НДС с продаж' },
  {
    code: '90.09',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Прибыль/убыток от продаж',
  },
  { code: '91.01', kind: AccountKind.PASSIVE, name: 'Прочие доходы' },
  { code: '91.02', kind: AccountKind.ACTIVE, name: 'Прочие расходы' },
  {
    code: '91.09',
    kind: AccountKind.ACTIVE_PASSIVE,
    name: 'Сальдо прочих доходов и расходов',
  },
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
    (existingAccounts?.accounts?.edges ?? []).map(
      (edge: any) => edge.node.code,
    ),
  );

  const missingAccounts = ACCOUNTS.filter(
    (account) => !existingCodes.has(account.code),
  );

  if (missingAccounts.length > 0) {
    await client.mutation({
      createAccounts: {
        __args: { data: missingAccounts as any },
        id: true,
      },
    } as any);
    console.log(
      `Seeded ${missingAccounts.length} account(s) of the ${ACCOUNTS.length}-account chart.`,
    );
  }

  // Дашборд «ERP-сводка»: page-layout (тип DASHBOARD, 4 виджета) применяется
  // декларативно через SDK apply (page-layouts/erp-summary-dashboard.page-layout.ts)
  // — здесь только создаётся ссылающийся на него dashboard-record. id
  // page-layout'а неизвестен заранее (universalIdentifier из apply-манифеста
  // НЕ становится реальным metadata id для сторонних приложений — resolve по
  // имени через MetadataApiClient), поэтому идёт отдельным шагом от createOne.
  const metadataClient = new MetadataApiClient();

  const { getPageLayouts } = (await metadataClient.query({
    getPageLayouts: {
      __args: { pageLayoutType: 'DASHBOARD' },
      id: true,
      name: true,
    },
  } as any)) as any;

  const dashboardPageLayout = (getPageLayouts ?? []).find(
    (layout: { name: string }) => layout.name === ERP_SUMMARY_DASHBOARD_NAME,
  );

  if (!dashboardPageLayout) {
    throw new Error(
      `Page layout "${ERP_SUMMARY_DASHBOARD_NAME}" (type DASHBOARD) not found — run 'apply' before post-install.`,
    );
  }

  // upsert: true + fixed id makes this step idempotent (re-running install
  // updates the same dashboard row instead of duplicating it).
  await client.mutation({
    createDashboard: {
      __args: {
        data: {
          id: ERP_SUMMARY_DASHBOARD_ID,
          title: ERP_SUMMARY_DASHBOARD_NAME,
          pageLayoutId: dashboardPageLayout.id,
          position: 1,
        },
        upsert: true,
      },
      id: true,
    },
  } as any);

  console.log(
    `Dashboard "${ERP_SUMMARY_DASHBOARD_NAME}" linked to page layout ${dashboardPageLayout.id}.`,
  );

  return {};
};

export default definePostInstallLogicFunction({
  universalIdentifier: '2b5e8614-6401-40f7-9018-0ab3d127ba63',
  name: 'post-install',
  description:
    'Заполняет рабочий план счетов РСБУ (идемпотентно по коду) и создаёт дашборд «ERP-сводка» (идемпотентно по id).',
  timeoutSeconds: 60,
  shouldRunSynchronously: true,
  handler,
});
