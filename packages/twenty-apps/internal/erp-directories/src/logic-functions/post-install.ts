import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

const handler = async () => {
  const client = new CoreApiClient();

  await client.mutation({
    createPriceTypes: {
      __args: {
        data: [{ name: 'Розничная', includesVat: true }] as any,
      },
      id: true,
    },
  } as any);

  await client.mutation({
    createWarehouses: {
      __args: {
        data: [{ name: 'Основной склад', isDefault: true }] as any,
      },
      id: true,
    },
  } as any);

  console.log('Seeded price type «Розничная» and warehouse «Основной склад».');

  return {};
};

export default definePostInstallLogicFunction({
  universalIdentifier: 'c6e2cccd-ce31-4eef-8e54-b2b1ce637a90',
  name: 'post-install',
  description:
    'Заполняет стартовые данные: вид цен «Розничная» и склад «Основной склад».',
  timeoutSeconds: 60,
  shouldRunSynchronously: true,
  handler,
});
