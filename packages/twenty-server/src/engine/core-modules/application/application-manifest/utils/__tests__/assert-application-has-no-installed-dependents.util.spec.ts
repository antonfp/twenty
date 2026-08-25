import { assertApplicationHasNoInstalledDependents } from 'src/engine/core-modules/application/application-manifest/utils/assert-application-has-no-installed-dependents.util';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';

const APP_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const APP_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const APP_C = 'cccccccc-0000-4000-8000-000000000003';

describe('assertApplicationHasNoInstalledDependents', () => {
  it('passes when no installed application depends on the target', () => {
    expect(() =>
      assertApplicationHasNoInstalledDependents({
        applicationUniversalIdentifier: APP_A,
        installedApplications: [
          { universalIdentifier: APP_A, name: 'App A', dependencies: [APP_B] },
          { universalIdentifier: APP_B, name: 'App B', dependencies: null },
          { universalIdentifier: APP_C, name: 'App C', dependencies: [] },
        ],
      }),
    ).not.toThrow();
  });

  it('throws FORBIDDEN naming the dependent applications', () => {
    let thrown: ApplicationException | undefined;

    try {
      assertApplicationHasNoInstalledDependents({
        applicationUniversalIdentifier: APP_B,
        installedApplications: [
          { universalIdentifier: APP_A, name: 'App A', dependencies: [APP_B] },
          { universalIdentifier: APP_B, name: 'App B', dependencies: null },
        ],
      });
    } catch (error) {
      thrown = error as ApplicationException;
    }

    expect(thrown).toBeInstanceOf(ApplicationException);
    expect(thrown?.code).toBe(ApplicationExceptionCode.FORBIDDEN);
    expect(thrown?.message).toContain('App A');
    expect(thrown?.message).toContain(APP_A);
  });

  it('ignores a stale self-referencing dependency row', () => {
    expect(() =>
      assertApplicationHasNoInstalledDependents({
        applicationUniversalIdentifier: APP_A,
        installedApplications: [
          { universalIdentifier: APP_A, name: 'App A', dependencies: [APP_A] },
        ],
      }),
    ).not.toThrow();
  });
});
