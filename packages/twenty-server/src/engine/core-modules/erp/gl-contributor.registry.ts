import { Injectable } from '@nestjs/common';

import { type GlContributor } from 'src/engine/core-modules/erp/types/posting.types';

// Mirrors PostingRulesRegistry (explicit registration from onModuleInit, see
// WIRING.md §3) for the GL glue layer: erp-accounting registers one
// contributor per document object; PostingService calls it only when the
// workspace actually has the glEntry object installed.
@Injectable()
export class GlContributorRegistry {
  private readonly contributorByObjectName = new Map<string, GlContributor>();

  registerGlContributor(
    objectNameSingular: string,
    contributor: GlContributor,
  ): void {
    this.contributorByObjectName.set(objectNameSingular, contributor);
  }

  resolveGlContributor(objectNameSingular: string): GlContributor | undefined {
    return this.contributorByObjectName.get(objectNameSingular);
  }
}
