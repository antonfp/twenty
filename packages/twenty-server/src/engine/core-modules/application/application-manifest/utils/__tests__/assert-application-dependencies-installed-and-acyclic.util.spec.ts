import { assertApplicationDependenciesInstalledAndAcyclic } from 'src/engine/core-modules/application/application-manifest/utils/assert-application-dependencies-installed-and-acyclic.util';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';

const APP_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const APP_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const APP_C = 'cccccccc-0000-4000-8000-000000000003';

const getThrownApplicationException = (run: () => void) => {
  try {
    run();
  } catch (error) {
    return error as ApplicationException;
  }

  return undefined;
};

describe('assertApplicationDependenciesInstalledAndAcyclic', () => {
  it('passes when no dependencies are declared', () => {
    expect(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: undefined,
        installedApplications: [],
      }),
    ).not.toThrow();

    expect(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [],
        installedApplications: [],
      }),
    ).not.toThrow();
  });

  it('passes when every declared dependency is installed', () => {
    expect(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [APP_B, APP_C],
        installedApplications: [
          { universalIdentifier: APP_B, dependencies: [APP_C] },
          { universalIdentifier: APP_C, dependencies: null },
        ],
      }),
    ).not.toThrow();
  });

  it('throws APP_NOT_INSTALLED naming the missing universal identifiers', () => {
    const exception = getThrownApplicationException(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [APP_B, APP_C],
        installedApplications: [
          { universalIdentifier: APP_B, dependencies: null },
        ],
      }),
    );

    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception?.code).toBe(ApplicationExceptionCode.APP_NOT_INSTALLED);
    expect(exception?.message).toContain(APP_C);
    expect(exception?.message).not.toContain(APP_B);
  });

  it('throws INVALID_INPUT on a direct cycle between two installed applications', () => {
    const exception = getThrownApplicationException(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [APP_B],
        installedApplications: [
          { universalIdentifier: APP_A, dependencies: null },
          { universalIdentifier: APP_B, dependencies: [APP_A] },
        ],
      }),
    );

    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception?.code).toBe(ApplicationExceptionCode.INVALID_INPUT);
    expect(exception?.message).toContain(APP_A);
  });

  it('throws on a transitive cycle', () => {
    const exception = getThrownApplicationException(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [APP_B],
        installedApplications: [
          { universalIdentifier: APP_A, dependencies: null },
          { universalIdentifier: APP_B, dependencies: [APP_C] },
          { universalIdentifier: APP_C, dependencies: [APP_A] },
        ],
      }),
    );

    expect(exception?.code).toBe(ApplicationExceptionCode.INVALID_INPUT);
  });

  it('throws when the application declares itself as a dependency', () => {
    const exception = getThrownApplicationException(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [APP_A],
        installedApplications: [],
      }),
    );

    expect(exception?.code).toBe(ApplicationExceptionCode.INVALID_INPUT);
  });

  it('ignores stale dependency edges of the application being re-synced', () => {
    // APP_A previously declared APP_B, which depends on APP_C; the incoming
    // manifest drops the APP_B dependency and only declares APP_C: no cycle.
    expect(() =>
      assertApplicationDependenciesInstalledAndAcyclic({
        applicationUniversalIdentifier: APP_A,
        declaredDependencies: [APP_C],
        installedApplications: [
          { universalIdentifier: APP_A, dependencies: [APP_B] },
          { universalIdentifier: APP_B, dependencies: [APP_C] },
          { universalIdentifier: APP_C, dependencies: null },
        ],
      }),
    ).not.toThrow();
  });
});
