import { Link } from 'react-router-dom';
import { t } from '@lingui/core/macro';
import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { AppPath } from 'twenty-shared/types';
import { MainButton } from 'twenty-ui/input';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledButtonContainer = styled.div`
  margin-top: ${themeCssVariables.spacing[8]};
  width: 200px;
`;

// Self-hosted subscription checkout (Stripe) was removed with the
// Enterprise cluster. useIsPlanRequired() is now permanently false
// (billing disabled), so this step should never be reached in practice;
// it only remains as a safe landing spot instead of a dead end.
export const ChooseYourPlan = () => {
  return (
    <>
      <Title>{t`No plan required`}</Title>
      <SubTitle>{t`Your workspace doesn't need a subscription to continue.`}</SubTitle>
      <StyledButtonContainer>
        <Link to={AppPath.Index}>
          <MainButton title={t`Continue`} fullWidth />
        </Link>
      </StyledButtonContainer>
    </>
  );
};
