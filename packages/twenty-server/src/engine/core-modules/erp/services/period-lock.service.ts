import { Injectable } from '@nestjs/common';

export type AssertPeriodOpenArgs = {
  workspaceId: string;
  postingDate: string;
};

// Extension point: when the accounting block lands, look up its period-lock
// object here and throw ErpPostingException with code PERIOD_LOCKED when
// postingDate falls into a closed period. Until then every period is open.
@Injectable()
export class PeriodLockService {
  async assertPeriodOpen(_args: AssertPeriodOpenArgs): Promise<void> {
    return;
  }
}
