import { useLingui } from '@lingui/react/macro';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';

// Self-hosted billing checkout (Stripe) was removed with the Enterprise
// cluster; this page only remains as a landing spot for old links/redirects.
export const SettingsBilling = () => {
  const { t } = useLingui();

  return (
    <SettingsPageLayout
      title={t`Billing`}
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: t`Billing` },
      ]}
    >
      <SettingsPageContainer>
        <Section>
          <H2Title
            title={t`Billing`}
            description={t`Billing is managed outside this workspace. Contact your administrator for subscription details.`}
          />
        </Section>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
