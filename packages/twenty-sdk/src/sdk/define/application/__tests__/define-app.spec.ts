import { defineApplication } from '@/sdk/define';

describe('defineApplication', () => {
  it('should return successful validation result when valid', () => {
    const config = {
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      defaultRoleUniversalIdentifier: '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
    };

    const result = defineApplication(config);

    expect(result.success).toBe(true);
    expect(result.config).toEqual({
      ...config,
      logo: undefined,
      galleryImages: [],
    });
    expect(result.errors).toEqual([]);
  });

  it('should pass through all optional fields', () => {
    const config = {
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      applicationVariables: {
        API_KEY: {
          universalIdentifier: '3a327392-3a0f-4605-9223-0633f063eaf6',
          description: 'API Key',
          isSecret: true,
        },
      },
      defaultRoleUniversalIdentifier: '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
    };

    const result = defineApplication(config);

    expect(result.success).toBe(true);
    expect(result.config).toEqual({
      ...config,
      logo: undefined,
      galleryImages: [],
    });
    expect(result.config?.applicationVariables).toBeDefined();
    expect(result.config?.defaultRoleUniversalIdentifier).toBe(
      '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
    );
  });

  it('should accept config without defaultRoleUniversalIdentifier (auto-wired by defineApplicationRole)', () => {
    const config = {
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
    };

    const result = defineApplication(config);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.config?.defaultRoleUniversalIdentifier).toBeUndefined();
  });

  it('should warn that defaultRoleUniversalIdentifier is deprecated when provided', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      defaultRoleUniversalIdentifier: '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
    });

    const warnings = result.warnings ?? [];

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/deprecated/i);
    expect(warnings[0]).toMatch(/defineApplicationRole/);
  });

  it('should warn when category is not a known ApplicationCategory', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      category: 'NotARealCategory',
    });

    const warnings = result.warnings ?? [];

    expect(result.success).toBe(true);
    expect(
      warnings.some((warning) => warning.includes('NotARealCategory')),
    ).toBe(true);
  });

  it('should not warn when category is a known ApplicationCategory', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      category: 'Data',
    });

    expect(result.warnings ?? []).toEqual([]);
  });

  it('should warn when a server variable is both required and deprecated', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      serverVariables: {
        API_KEY: { isRequired: true, isDeprecated: true },
      },
    });

    const warnings = result.warnings ?? [];

    expect(result.success).toBe(true);
    expect(warnings.some((warning) => warning.includes('API_KEY'))).toBe(true);
  });

  it('should return error when universalIdentifier is missing', () => {
    const config = {
      displayName: 'My App',
    };

    const result = defineApplication(config as any);

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Application must have a universalIdentifier',
    );
  });

  it('should return error when universalIdentifier is empty string', () => {
    const config = {
      universalIdentifier: '',
      displayName: 'My App',
    };

    const result = defineApplication(config as any);

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Application must have a universalIdentifier',
    );
  });

  it('should accept a valid dependencies array', () => {
    const config = {
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      dependencies: [
        '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
        '3a327392-3a0f-4605-9223-0633f063eaf6',
      ],
    };

    const result = defineApplication(config);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.config?.dependencies).toEqual(config.dependencies);
  });

  it('should not require dependencies to be set', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
    });

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.config?.dependencies).toBeUndefined();
  });

  it('should return error when a dependency is not a valid UUID', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      dependencies: ['not-a-uuid'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Application dependencies must be valid UUID strings, found: not-a-uuid',
    );
  });

  it('should return error when dependencies contain duplicates', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      dependencies: [
        '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
        '68bb56f3-8300-4cb5-8cc3-8da9ee66f1b2',
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Application dependencies must not contain duplicates',
    );
  });

  it('should return error when an application depends on itself', () => {
    const result = defineApplication({
      universalIdentifier: 'a9faf5f8-cf7e-4f24-9d37-fd523c30febe',
      displayName: 'My App',
      description: 'My app description',
      dependencies: ['a9faf5f8-cf7e-4f24-9d37-fd523c30febe'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Application cannot declare itself as a dependency',
    );
  });
});
