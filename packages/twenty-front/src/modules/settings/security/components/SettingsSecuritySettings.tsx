import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useDebouncedCallback } from 'use-debounce';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { Separator } from '@/settings/components/Separator';
import { SettingsOptionCardContentCounter } from '@/settings/components/SettingsOptions/SettingsOptionCardContentCounter';
import { SettingsOptionCardContentToggle } from '@/settings/components/SettingsOptions/SettingsOptionCardContentToggle';
import { SettingsRoleDefaultRole } from '@/settings/roles/components/SettingsRolesDefaultRole';
import { SettingsRolesQueryEffect } from '@/settings/roles/components/SettingsRolesQueryEffect';
import { useSettingsAllRoles } from '@/settings/roles/hooks/useSettingsAllRoles';
import { SettingsSecurityAuthProvidersOptionsList } from '@/settings/security/components/SettingsSecurityAuthProvidersOptionsList';
import { SettingsSecurityEditableProfileFields } from '@/settings/security/components/SettingsSecurityEditableProfileFields';
import { ToggleImpersonate } from '@/settings/workspace/components/ToggleImpersonate';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { IconMail, IconTrash } from 'twenty-ui/icon';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { Card } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { UpdateWorkspaceDocument } from '~/generated-metadata/graphql';

const StyledContainer = styled.div`
  width: 100%;
`;

const StyledMainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[10]};
  min-height: 200px;
`;

export const SettingsSecuritySettings = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();

  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const [currentWorkspace, setCurrentWorkspace] = useAtomState(
    currentWorkspaceState,
  );
  const [updateWorkspace] = useMutation(UpdateWorkspaceDocument);

  const saveTrashRetention = useDebouncedCallback(async (value: number) => {
    try {
      await updateWorkspace({
        variables: {
          input: {
            trashRetentionDays: value,
          },
        },
      });
    } catch (err) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(err) ? err : undefined,
      });
    }
  }, 500);

  const handleTrashRetentionDaysChange = (value: number) => {
    if (!currentWorkspace) {
      return;
    }

    if (value === currentWorkspace.trashRetentionDays) {
      return;
    }

    setCurrentWorkspace({
      ...currentWorkspace,
      trashRetentionDays: value,
    });

    saveTrashRetention(value);
  };

  const handleSyncInternalEmailsChange = (value: boolean) => {
    if (!currentWorkspace) {
      return;
    }

    if (value === currentWorkspace.isInternalMessagesImportEnabled) {
      return;
    }

    setCurrentWorkspace({
      ...currentWorkspace,
      isInternalMessagesImportEnabled: value,
    });

    updateWorkspace({
      variables: {
        input: {
          isInternalMessagesImportEnabled: value,
        },
      },
    }).catch((err) => {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(err) ? err : undefined,
      });
    });
  };

  const roles = useSettingsAllRoles();

  return (
    <>
      <SettingsRolesQueryEffect />
      <StyledMainContent>
        <Section>
          <StyledContainer>
            <H2Title
              title={t`Authentication`}
              description={t`Customize your workspace security`}
            />
            <SettingsSecurityAuthProvidersOptionsList />
          </StyledContainer>
        </Section>
        <Section>
          <StyledContainer>
            <H2Title
              title={t`Editable Profile Fields`}
              description={t`Choose which profile fields users with the Edit Profile permission can modify`}
            />
            <SettingsSecurityEditableProfileFields />
          </StyledContainer>
        </Section>
        <SettingsRoleDefaultRole roles={roles} />
        {isMultiWorkspaceEnabled && (
          <Section>
            <H2Title
              title={t`Support`}
              description={t`Manage support access settings`}
            />
            <ToggleImpersonate />
          </Section>
        )}
        <Section>
          <H2Title title={t`Other`} description={t`Other security settings`} />
          <Card rounded>
            <SettingsOptionCardContentCounter
              Icon={IconTrash}
              title={t`Erasure of soft-deleted records`}
              description={t`Permanent deletion. Enter the number of days.`}
              value={currentWorkspace?.trashRetentionDays ?? 14}
              onChange={handleTrashRetentionDaysChange}
              minValue={0}
              showButtons={false}
            />
            <Separator />
            <SettingsOptionCardContentToggle
              Icon={IconMail}
              title={t`Sync Internal Emails`}
              description={t`Include emails where all participants share the same domain.`}
              checked={
                currentWorkspace?.isInternalMessagesImportEnabled ?? false
              }
              onChange={handleSyncInternalEmailsChange}
              advancedMode
            />
          </Card>
        </Section>
      </StyledMainContent>
    </>
  );
};
