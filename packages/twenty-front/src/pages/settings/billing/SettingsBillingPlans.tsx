import { useLingui } from '@lingui/react/macro';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';

// Self-hosted plan switching (Stripe) was removed with the Enterprise
// cluster; this page only remains as a landing spot for old links/redirects.
export const SettingsBillingPlans = () => {
  const { t } = useLingui();

  return (
    <SettingsPageLayout
      title={t`Plans`}
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        {
          children: t`Billing`,
          href: getSettingsPath(SettingsPath.Billing),
        },
        { children: t`Plans` },
      ]}
    >
      <SettingsPageContainer>
        <Section>
          <H2Title
            title={t`Plans`}
            description={t`Plan changes are managed outside this workspace. Contact your administrator to upgrade.`}
          />
        </Section>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
