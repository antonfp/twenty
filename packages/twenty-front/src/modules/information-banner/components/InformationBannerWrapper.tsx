import { styled } from '@linaria/react';

import { InformationBannerNonProductionInstance } from '@/information-banner/components/enterprise/InformationBannerNonProductionInstance';
import { InformationBannerMaintenance } from '@/information-banner/components/maintenance/InformationBannerMaintenance';
import { InformationBannerReconnectAccountEmailAliases } from '@/information-banner/components/reconnect-account/InformationBannerReconnectAccountEmailAliases';
import { InformationBannerReconnectAccountInsufficientPermissions } from '@/information-banner/components/reconnect-account/InformationBannerReconnectAccountInsufficientPermissions';
import { usePermissionFlagMap } from '@/settings/roles/hooks/usePermissionFlagMap';
import { PermissionFlagType } from '~/generated-metadata/graphql';

const StyledInformationBannerWrapper = styled.div`
  position: relative;

  &:empty {
    height: 0;
  }
`;

// Self-hosted billing (Stripe) was removed with the Enterprise cluster,
// so the subscription-status banners (paused/canceled/past due/trial/
// credits cap) that used to live here can never trigger anymore
// (billing is permanently disabled) and were dropped.
export const InformationBannerWrapper = () => {
  const permissionMap = usePermissionFlagMap();
  const isAccountSyncEnabled =
    permissionMap[PermissionFlagType.CONNECTED_ACCOUNTS];

  return (
    <StyledInformationBannerWrapper>
      <InformationBannerNonProductionInstance />
      <InformationBannerMaintenance />
      {isAccountSyncEnabled && (
        <InformationBannerReconnectAccountInsufficientPermissions />
      )}
      {isAccountSyncEnabled && (
        <InformationBannerReconnectAccountEmailAliases />
      )}
    </StyledInformationBannerWrapper>
  );
};
