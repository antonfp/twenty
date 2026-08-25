import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';

import { type DomainValidRecords } from 'src/engine/core-modules/dns-manager/dtos/domain-valid-records';
import {
  DnsManagerException,
  DnsManagerExceptionCode,
} from 'src/engine/core-modules/dns-manager/exceptions/dns-manager.exception';

type DnsManagerOptions = {
  isPublicDomain?: boolean;
};

// Clean-room stub preserving the not-configured semantics of the removed
// Enterprise Cloudflare DNS integration: no DNS provider is ever configured,
// so hostname operations are rejected and cleanup calls are no-ops.
@Injectable()
export class DnsManagerService {
  isConfigured(): boolean {
    return false;
  }

  async registerHostname(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<never> {
    this.throwNotConfigured();
  }

  async updateHostname(
    _fromHostname: string,
    _toHostname: string,
    _options?: DnsManagerOptions,
  ): Promise<never> {
    this.throwNotConfigured();
  }

  async refreshHostname(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<DomainValidRecords> {
    this.throwNotConfigured();
  }

  async getHostnameWithRecords(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<DomainValidRecords | undefined> {
    this.throwNotConfigured();
  }

  async isHostnameWorking(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<boolean> {
    return false;
  }

  async deleteHostnameSilently(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<void> {
    // Nothing to delete: no DNS provider is configured on this fork.
  }

  private throwNotConfigured(): never {
    throw new DnsManagerException(
      'DNS manager is not configured',
      DnsManagerExceptionCode.CLOUDFLARE_CLIENT_NOT_INITIALIZED,
      {
        userFriendlyMessage: msg`Custom domain DNS management is not available on this server.`,
      },
    );
  }
}
