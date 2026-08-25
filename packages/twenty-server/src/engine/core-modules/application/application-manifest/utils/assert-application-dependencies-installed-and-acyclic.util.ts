import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';

type InstalledApplicationDependencyEdge = {
  universalIdentifier: string;
  dependencies: string[] | null;
};

// Rejects a manifest whose declared dependencies are not installed in the
// workspace, or whose declared set would make the application part of its own
// transitive dependency closure (cycle). Walks only installed applications:
// a cycle can therefore only appear when an already-installed application is
// being re-synced with a manifest that closes the loop.
export const assertApplicationDependenciesInstalledAndAcyclic = ({
  applicationUniversalIdentifier,
  declaredDependencies,
  installedApplications,
}: {
  applicationUniversalIdentifier: string;
  declaredDependencies: string[] | null | undefined;
  installedApplications: InstalledApplicationDependencyEdge[];
}): void => {
  if (!isDefined(declaredDependencies) || declaredDependencies.length === 0) {
    return;
  }

  const installedUniversalIdentifiers = new Set(
    installedApplications.map(
      (installedApplication) => installedApplication.universalIdentifier,
    ),
  );

  const missingDependencies = declaredDependencies.filter(
    (dependencyUniversalIdentifier) =>
      dependencyUniversalIdentifier !== applicationUniversalIdentifier &&
      !installedUniversalIdentifiers.has(dependencyUniversalIdentifier),
  );

  if (missingDependencies.length > 0) {
    const missingList = missingDependencies.join(', ');

    throw new ApplicationException(
      `Application "${applicationUniversalIdentifier}" declares dependencies that are not installed in this workspace: ${missingList}. Install them first.`,
      ApplicationExceptionCode.APP_NOT_INSTALLED,
      {
        userFriendlyMessage: msg`Сначала установите приложение-зависимость: ${missingList}`,
      },
    );
  }

  const dependenciesByUniversalIdentifier = new Map(
    installedApplications.map((installedApplication) => [
      installedApplication.universalIdentifier,
      installedApplication.dependencies ?? [],
    ]),
  );

  // The incoming manifest overrides whatever the application declared before.
  dependenciesByUniversalIdentifier.set(
    applicationUniversalIdentifier,
    declaredDependencies,
  );

  const visitedUniversalIdentifiers = new Set<string>();
  const universalIdentifiersToVisit = [...declaredDependencies];

  while (universalIdentifiersToVisit.length > 0) {
    const currentUniversalIdentifier = universalIdentifiersToVisit.pop();

    if (
      !isDefined(currentUniversalIdentifier) ||
      visitedUniversalIdentifiers.has(currentUniversalIdentifier)
    ) {
      continue;
    }

    if (currentUniversalIdentifier === applicationUniversalIdentifier) {
      throw new ApplicationException(
        `Circular application dependency detected: "${applicationUniversalIdentifier}" is part of its own dependency closure (via declared dependencies ${declaredDependencies.join(', ')}).`,
        ApplicationExceptionCode.INVALID_INPUT,
        {
          userFriendlyMessage: msg`Обнаружена циклическая зависимость приложений: ${applicationUniversalIdentifier}`,
        },
      );
    }

    visitedUniversalIdentifiers.add(currentUniversalIdentifier);

    universalIdentifiersToVisit.push(
      ...(dependenciesByUniversalIdentifier.get(currentUniversalIdentifier) ??
        []),
    );
  }
};
