import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import {
  DadataException,
  DadataExceptionCode,
} from 'src/engine/core-modules/dadata/dadata.exception';
import {
  type DadataPartyResult,
  type DadataPartyStatus,
  type DadataPartyType,
} from 'src/engine/core-modules/dadata/types/dadata.types';
import { isValidInn } from 'src/engine/core-modules/dadata/utils/is-valid-inn.util';

export const DADATA_FIND_PARTY_BY_INN_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party';

// Raw DaData shapes stay internal to this service — consumers only ever see
// DadataPartyResult, so a DaData contract change is absorbed here.
type DadataRawPartyData = {
  inn: string;
  kpp?: string | null;
  ogrn: string;
  type: DadataPartyType;
  name?: {
    full_with_opf?: string | null;
    short_with_opf?: string | null;
  } | null;
  opf?: { short?: string | null } | null;
  management?: { name?: string | null; post?: string | null } | null;
  address?: { value?: string | null; unrestricted_value?: string | null } | null;
  state: {
    status: DadataPartyStatus;
    registration_date?: number | null;
  };
  okved?: string | null;
};

type DadataRawSuggestion = {
  value?: string;
  unrestricted_value?: string;
  data: DadataRawPartyData;
};

type DadataFindPartyResponse = {
  suggestions?: DadataRawSuggestion[];
};

@Injectable()
export class DadataService {
  async findPartyByInn(inn: string): Promise<DadataPartyResult | null> {
    if (!isValidInn(inn)) {
      throw new DadataException(
        `Invalid INN: "${inn}"`,
        DadataExceptionCode.INVALID_INN,
      );
    }

    // ponytail: env read directly; migrate to TwentyConfigService when wiring (avoids concurrent edit of twenty-config)
    const apiKey = process.env.DADATA_API_KEY;

    if (!isNonEmptyString(apiKey)) {
      throw new DadataException(
        'DADATA_API_KEY environment variable is not set',
        DadataExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    let response: Response;

    try {
      response = await fetch(DADATA_FIND_PARTY_BY_INN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Token ${apiKey}`,
        },
        // branch_type MAIN keeps the head office out of a branch (филиал) list
        body: JSON.stringify({ query: inn, branch_type: 'MAIN' }),
      });
    } catch (error) {
      throw new DadataException(
        `DaData request failed: ${error instanceof Error ? error.message : String(error)}`,
        DadataExceptionCode.REQUEST_FAILED,
      );
    }

    // DaData throttles per second with 429; 403 means a rejected key or an
    // exhausted daily quota — kept distinct so callers can retry only the 429.
    if (response.status === 429) {
      throw new DadataException(
        'DaData rate limit exceeded (HTTP 429)',
        DadataExceptionCode.RATE_LIMITED,
      );
    }

    if (response.status === 403) {
      throw new DadataException(
        'DaData access denied: rejected API key or daily request limit reached (HTTP 403)',
        DadataExceptionCode.FORBIDDEN,
      );
    }

    if (!response.ok) {
      throw new DadataException(
        `DaData request failed (HTTP ${response.status})`,
        DadataExceptionCode.REQUEST_FAILED,
      );
    }

    const responseBody = (await response.json()) as DadataFindPartyResponse;
    const [firstSuggestion] = responseBody.suggestions ?? [];

    if (!isDefined(firstSuggestion)) {
      return null;
    }

    return this.mapSuggestionToPartyResult(firstSuggestion);
  }

  private mapSuggestionToPartyResult(
    suggestion: DadataRawSuggestion,
  ): DadataPartyResult {
    const { data } = suggestion;
    const registrationDateEpochMs = data.state.registration_date;

    return {
      inn: data.inn,
      kpp: isNonEmptyString(data.kpp) ? data.kpp : null,
      ogrn: data.ogrn,
      shortName:
        data.name?.short_with_opf ??
        data.name?.full_with_opf ??
        suggestion.value ??
        '',
      fullName: data.name?.full_with_opf ?? suggestion.unrestricted_value ?? '',
      opfShort: data.opf?.short ?? '',
      managementName: data.management?.name ?? null,
      managementPost: data.management?.post ?? null,
      // unrestricted_value carries the postal code, the canonical requisites form
      legalAddress:
        data.address?.unrestricted_value ?? data.address?.value ?? '',
      status: data.state.status,
      registrationDate: isDefined(registrationDateEpochMs)
        ? new Date(registrationDateEpochMs).toISOString().slice(0, 10)
        : null,
      okved: data.okved ?? null,
      type: data.type,
    };
  }
}
