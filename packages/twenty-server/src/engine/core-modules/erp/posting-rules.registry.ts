import { Injectable } from '@nestjs/common';

import { type PostingRulesProvider } from 'src/engine/core-modules/erp/types/posting.types';

// Explicit registration (block modules call registerPostingRules from their
// onModuleInit) instead of DiscoveryService scanning: ERP blocks are installed
// dynamically as applications, so the registry cannot know their modules
// up-front the way MetadataSideEffectHandlerRegistryService knows its handlers.
@Injectable()
export class PostingRulesRegistry {
  private readonly providersByObjectName = new Map<
    string,
    PostingRulesProvider[]
  >();

  registerPostingRules(
    objectNameSingular: string,
    provider: PostingRulesProvider,
  ): void {
    const providers = this.providersByObjectName.get(objectNameSingular) ?? [];

    providers.push(provider);
    this.providersByObjectName.set(objectNameSingular, providers);
  }

  resolvePostingRules(objectNameSingular: string): PostingRulesProvider[] {
    return this.providersByObjectName.get(objectNameSingular) ?? [];
  }
}
