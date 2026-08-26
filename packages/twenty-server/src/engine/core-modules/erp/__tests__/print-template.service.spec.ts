import { PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const BUILT_IN_HTML = [
  '<div>{{invoice_number}}</div>',
  '<!-- BEGIN line -->',
  '<tr><td>{{item_name}}</td></tr>',
  '<!-- END line -->',
].join('\n');

const buildFakeWorkspaceContext = (): ORMWorkspaceContext => {
  return {
    authContext: buildSystemAuthContext(WORKSPACE_ID),
  } as unknown as ORMWorkspaceContext;
};

const createMockRepository = () => ({
  findBy: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
});

type MockRepository = ReturnType<typeof createMockRepository>;

describe('PrintTemplateService', () => {
  let service: PrintTemplateService;
  let repository: MockRepository;

  beforeEach(() => {
    repository = createMockRepository();

    const ormManager = {
      executeInWorkspaceContext: jest.fn((callback: () => unknown) =>
        withWorkspaceContext(buildFakeWorkspaceContext(), callback),
      ),
      getRepository: jest.fn(async () => repository),
    };

    service = new PrintTemplateService(
      ormManager as unknown as GlobalWorkspaceOrmManager,
    );
  });

  describe('findActiveTemplate', () => {
    it('returns null when no active record exists for the documentType', async () => {
      repository.findBy.mockResolvedValue([]);

      const result = await service.findActiveTemplate(WORKSPACE_ID, 'SCHET');

      expect(result).toBeNull();
      expect(repository.findBy).toHaveBeenCalledWith({
        documentType: 'SCHET',
        isActive: true,
      });
    });

    it('returns the most recently created record when several are active', async () => {
      repository.findBy.mockResolvedValue([
        { id: 'older', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'newer', createdAt: '2026-06-01T00:00:00.000Z' },
      ]);

      const result = await service.findActiveTemplate(WORKSPACE_ID, 'SCHET');

      expect(result?.id).toBe('newer');
    });
  });

  describe('resolveTemplateHtml', () => {
    it('falls back to the built-in template when there is no active override', () => {
      const result = service.resolveTemplateHtml(null, BUILT_IN_HTML);

      expect(result).toEqual({
        html: BUILT_IN_HTML,
        source: 'built-in',
        fallbackReason: null,
      });
    });

    it('renders the active override when it has real content and a line block', () => {
      const customHtml = [
        '<div>Спасибо за покупку!</div>',
        '<!-- BEGIN line -->',
        '<tr><td>{{item_name}}</td></tr>',
        '<!-- END line -->',
      ].join('\n');

      const result = service.resolveTemplateHtml(
        { id: 'tpl-1', template: customHtml },
        BUILT_IN_HTML,
      );

      expect(result).toEqual({
        html: customHtml,
        source: 'custom',
        fallbackReason: null,
      });
    });

    it('falls back and warns when the active override is blank', () => {
      const result = service.resolveTemplateHtml(
        { id: 'tpl-1', template: '   ' },
        BUILT_IN_HTML,
      );

      expect(result.html).toBe(BUILT_IN_HTML);
      expect(result.source).toBe('built-in');
      expect(result.fallbackReason).toMatch(/пуст/);
    });

    it('falls back and warns when the active override has no line block', () => {
      const result = service.resolveTemplateHtml(
        { id: 'tpl-1', template: '<div>{{invoice_number}}</div>' },
        BUILT_IN_HTML,
      );

      expect(result.html).toBe(BUILT_IN_HTML);
      expect(result.source).toBe('built-in');
      expect(result.fallbackReason).toMatch(/блока строк/);
    });
  });

  describe('createOrUpdateActiveTemplate', () => {
    it('creates a new record when none exists for the documentType', async () => {
      repository.findBy.mockResolvedValue([]);

      const result = await service.createOrUpdateActiveTemplate(
        WORKSPACE_ID,
        'SCHET',
        '<div>{{invoice_number}}</div>',
      );

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: result.id,
          documentType: 'SCHET',
          template: '<div>{{invoice_number}}</div>',
          isActive: true,
        }),
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates the most recently touched existing record instead of creating a new one', async () => {
      repository.findBy.mockResolvedValue([
        { id: 'older', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'newer', createdAt: '2026-06-01T00:00:00.000Z' },
      ]);

      const result = await service.createOrUpdateActiveTemplate(
        WORKSPACE_ID,
        'SCHET',
        '<div>new html</div>',
      );

      expect(result.id).toBe('newer');
      expect(repository.update).toHaveBeenCalledWith(
        'newer',
        expect.objectContaining({
          template: '<div>new html</div>',
          isActive: true,
        }),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
