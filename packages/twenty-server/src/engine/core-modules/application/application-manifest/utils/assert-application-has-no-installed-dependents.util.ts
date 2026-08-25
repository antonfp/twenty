import { msg } from '@lingui/core/macro';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';

type InstalledApplicationDependent = {
  universalIdentifier: string;
  name: string;
  dependencies: string[] | null;
};

// Blocks uninstalling an application that another installed application
// declares as a dependency in its manifest.
export const assertApplicationHasNoInstalledDependents = ({
  applicationUniversalIdentifier,
  installedApplications,
}: {
  applicationUniversalIdentifier: string;
  installedApplications: InstalledApplicationDependent[];
}): void => {
  const dependentApplications = installedApplications.filter(
    (installedApplication) =>
      installedApplication.universalIdentifier !==
        applicationUniversalIdentifier &&
      (installedApplication.dependencies ?? []).includes(
        applicationUniversalIdentifier,
      ),
  );

  if (dependentApplications.length === 0) {
    return;
  }

  const dependentList = dependentApplications
    .map(
      (dependentApplication) =>
        `${dependentApplication.name} (${dependentApplication.universalIdentifier})`,
    )
    .join(', ');

  throw new ApplicationException(
    `Application "${applicationUniversalIdentifier}" cannot be uninstalled: it is a declared dependency of installed application(s) ${dependentList}. Uninstall them first.`,
    ApplicationExceptionCode.FORBIDDEN,
    {
      userFriendlyMessage: msg`Сначала удалите зависимые приложения: ${dependentList}`,
    },
  );
};
