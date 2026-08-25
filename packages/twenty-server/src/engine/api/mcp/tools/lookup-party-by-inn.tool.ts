import { z } from 'zod';

import { type DadataService } from 'src/engine/core-modules/dadata/services/dadata.service';
import { type DadataPartyResult } from 'src/engine/core-modules/dadata/types/dadata.types';

export const LOOKUP_PARTY_BY_INN_TOOL_NAME = 'lookup_party_by_inn';

export const lookupPartyByInnInputSchema = z.object({
  inn: z
    .string()
    .regex(/^\d{10}(\d{2})?$/)
    .describe('Russian INN: 10 digits for a legal entity, 12 for an individual entrepreneur'),
});

export type LookupPartyByInnResult = {
  party: DadataPartyResult | null;
  message: string;
};

export const createLookupPartyByInnTool = (dadataService: DadataService) => ({
  description:
    'Look up Russian company/entrepreneur requisites by INN via DaData: name, KPP, OGRN, legal address, management, status. Use before creating a контрагент so its requisites are filled correctly.',
  inputSchema: lookupPartyByInnInputSchema,
  execute: async ({
    inn,
  }: z.infer<typeof lookupPartyByInnInputSchema>): Promise<LookupPartyByInnResult> => {
    const party = await dadataService.findPartyByInn(inn);

    return {
      party,
      message: party
        ? `Found: ${party.shortName} (ИНН ${party.inn}${party.kpp ? `, КПП ${party.kpp}` : ''}), status ${party.status}.`
        : `No party found for INN ${inn}.`,
    };
  },
});
