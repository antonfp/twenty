import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

// Idempotent: re-running the install (or executing the function manually)
// must not duplicate seed records, so every create is guarded by a lookup.
const handler = async () => {
  const client = new CoreApiClient();

  const existingPriceTypes = (await client.query({
    priceTypes: {
      __args: { filter: { name: { eq: 'Розничная' } } as any },
      edges: { node: { id: true } },
    },
  } as any)) as any;

  if ((existingPriceTypes?.priceTypes?.edges ?? []).length === 0) {
    await client.mutation({
      createPriceTypes: {
        __args: {
          data: [{ name: 'Розничная', includesVat: true }] as any,
        },
        id: true,
      },
    } as any);
    console.log('Seeded price type «Розничная».');
  }

  const existingWarehouses = (await client.query({
    warehouses: {
      __args: { filter: { name: { eq: 'Основной склад' } } as any },
      edges: { node: { id: true } },
    },
  } as any)) as any;

  if ((existingWarehouses?.warehouses?.edges ?? []).length === 0) {
    await client.mutation({
      createWarehouses: {
        __args: {
          data: [{ name: 'Основной склад', isDefault: true }] as any,
        },
        id: true,
      },
    } as any);
    console.log('Seeded warehouse «Основной склад».');
  }

  return {};
};

export default definePostInstallLogicFunction({
  universalIdentifier: 'c6e2cccd-ce31-4eef-8e54-b2b1ce637a90',
  name: 'post-install',
  description:
    'Заполняет стартовые данные: вид цен «Розничная» и склад «Основной склад» (идемпотентно).',
  timeoutSeconds: 60,
  shouldRunSynchronously: true,
  handler,
});
