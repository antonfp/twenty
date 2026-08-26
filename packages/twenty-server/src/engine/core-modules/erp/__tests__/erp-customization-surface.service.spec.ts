import { ErpCustomizationSurfaceService } from 'src/engine/core-modules/erp/services/erp-customization-surface.service';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CUSTOM_APP_ID = 'app-custom';
const ERP_SALES_APP_ID = 'app-erp-sales';

const buildApplicationService = () =>
  ({
    findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
      .fn()
      .mockResolvedValue({
        workspaceCustomFlatApplication: { id: CUSTOM_APP_ID },
      }),
  }) as unknown as ApplicationService;

const buildFlatEntityMapsCacheService = () =>
  ({
    getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue({
      flatObjectMetadataMaps: {
        byUniversalIdentifier: {
          contract: {
            id: 'obj-contract',
            nameSingular: 'contract',
            namePlural: 'contracts',
            labelSingular: 'Договор',
            applicationId: CUSTOM_APP_ID,
            isSystem: false,
          },
          salesInvoice: {
            id: 'obj-sales-invoice',
            nameSingular: 'salesInvoice',
            namePlural: 'salesInvoices',
            labelSingular: 'Счёт',
            applicationId: ERP_SALES_APP_ID,
            isSystem: false,
          },
          glEntry: {
            id: 'obj-gl-entry',
            nameSingular: 'glEntry',
            namePlural: 'glEntries',
            labelSingular: 'Проводка',
            applicationId: ERP_SALES_APP_ID,
            isSystem: false,
          },
        },
      },
      flatFieldMetadataMaps: {
        byUniversalIdentifier: {
          f1: { objectMetadataId: 'obj-sales-invoice' },
          f2: { objectMetadataId: 'obj-sales-invoice' },
        },
      },
      flatApplicationMaps: {
        byId: {
          [ERP_SALES_APP_ID]: { name: 'erp-sales' },
        },
      },
    }),
  }) as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

describe('ErpCustomizationSurfaceService', () => {
  it('classifies custom, app-owned, and register objects, with canAddFields off only for registers', async () => {
    const service = new ErpCustomizationSurfaceService(
      buildApplicationService(),
      buildFlatEntityMapsCacheService(),
    );

    const entries = await service.listCustomizationSurface(WORKSPACE_ID);
    const byName = new Map(entries.map((entry) => [entry.nameSingular, entry]));

    expect(byName.get('contract')).toMatchObject({
      origin: 'custom',
      canAddFields: true,
      ownerApplicationName: undefined,
    });
    expect(byName.get('salesInvoice')).toMatchObject({
      origin: 'app-owned',
      canAddFields: true,
      ownerApplicationName: 'erp-sales',
      fieldCount: 2,
    });
    expect(byName.get('glEntry')).toMatchObject({
      origin: 'register',
      canAddFields: false,
    });
  });
});
