import {
  DadataException,
  DadataExceptionCode,
} from 'src/engine/core-modules/dadata/dadata.exception';
import {
  DADATA_FIND_PARTY_BY_INN_URL,
  DadataService,
} from 'src/engine/core-modules/dadata/services/dadata.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const VALID_LEGAL_INN = '7707083893';
const VALID_INDIVIDUAL_INN = '500100732259';

// Shapes mirror the public DaData findById/party documentation examples.
const legalPartyResponseFixture = {
  suggestions: [
    {
      value: 'ПАО СБЕРБАНК',
      unrestricted_value: 'ПАО СБЕРБАНК',
      data: {
        inn: '7707083893',
        kpp: '773601001',
        ogrn: '1027700132195',
        ogrn_date: 1027987200000,
        hid: '145a83ab38c9ad95889a7b894ce57a97cf6f6d5f42932a71331ff18a5601a99b',
        type: 'LEGAL',
        name: {
          full_with_opf: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО "СБЕРБАНК РОССИИ"',
          short_with_opf: 'ПАО СБЕРБАНК',
          full: 'СБЕРБАНК РОССИИ',
          short: 'СБЕРБАНК',
        },
        okato: '45293554000',
        oktmo: '45397000000',
        okpo: '00032537',
        okved: '64.19',
        okved_type: '2014',
        opf: {
          type: '2014',
          code: '12247',
          full: 'публичное акционерное общество',
          short: 'ПАО',
        },
        management: {
          name: 'Греф Герман Оскарович',
          post: 'ПРЕЗИДЕНТ, ПРЕДСЕДАТЕЛЬ ПРАВЛЕНИЯ',
        },
        branch_count: 88,
        branch_type: 'MAIN',
        address: {
          value: 'г Москва, ул Вавилова, д 19',
          unrestricted_value: '117312, г Москва, ул Вавилова, д 19',
        },
        state: {
          actuality_date: 1741564800000,
          registration_date: 677376000000,
          liquidation_date: null,
          status: 'ACTIVE',
        },
      },
    },
  ],
};

const individualPartyResponseFixture = {
  suggestions: [
    {
      value: 'ИП Иванов Иван Иванович',
      unrestricted_value: 'ИП Иванов Иван Иванович',
      data: {
        inn: '500100732259',
        kpp: null,
        ogrn: '304500116000157',
        ogrn_date: 1086912000000,
        type: 'INDIVIDUAL',
        name: {
          full_with_opf: 'Индивидуальный предприниматель Иванов Иван Иванович',
          short_with_opf: 'ИП Иванов Иван Иванович',
          full: 'Иванов Иван Иванович',
        },
        fio: {
          surname: 'Иванов',
          name: 'Иван',
          patronymic: 'Иванович',
        },
        okved: '47.11',
        opf: {
          type: '2014',
          code: '50102',
          full: 'Индивидуальный предприниматель',
          short: 'ИП',
        },
        management: null,
        branch_type: 'MAIN',
        address: {
          value: 'Московская обл, г Балашиха',
          unrestricted_value: 'Московская обл, г Балашиха',
        },
        state: {
          actuality_date: 1741564800000,
          registration_date: 1086912000000,
          liquidation_date: null,
          status: 'ACTIVE',
        },
      },
    },
  ],
};

describe('DadataService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const configGetMock = jest.fn();
  const twentyConfigServiceMock = {
    get: configGetMock,
  } as unknown as TwentyConfigService;

  let service: DadataService;

  const mockFetchJsonResponse = (body: unknown, status = 200) => {
    fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  };

  beforeEach(() => {
    service = new DadataService(twentyConfigServiceMock);
    configGetMock.mockReturnValue('test-api-key');
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    configGetMock.mockReset();
  });

  it('maps a LEGAL suggestion to DadataPartyResult', async () => {
    mockFetchJsonResponse(legalPartyResponseFixture);

    const result = await service.findPartyByInn(VALID_LEGAL_INN);

    expect(result).toEqual({
      inn: '7707083893',
      kpp: '773601001',
      ogrn: '1027700132195',
      shortName: 'ПАО СБЕРБАНК',
      fullName: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО "СБЕРБАНК РОССИИ"',
      opfShort: 'ПАО',
      managementName: 'Греф Герман Оскарович',
      managementPost: 'ПРЕЗИДЕНТ, ПРЕДСЕДАТЕЛЬ ПРАВЛЕНИЯ',
      legalAddress: '117312, г Москва, ул Вавилова, д 19',
      status: 'ACTIVE',
      registrationDate: '1991-06-20',
      okved: '64.19',
      type: 'LEGAL',
    });
  });

  it('maps an INDIVIDUAL suggestion with null kpp and management', async () => {
    mockFetchJsonResponse(individualPartyResponseFixture);

    const result = await service.findPartyByInn(VALID_INDIVIDUAL_INN);

    expect(result).toEqual({
      inn: '500100732259',
      kpp: null,
      ogrn: '304500116000157',
      shortName: 'ИП Иванов Иван Иванович',
      fullName: 'Индивидуальный предприниматель Иванов Иван Иванович',
      opfShort: 'ИП',
      managementName: null,
      managementPost: null,
      legalAddress: 'Московская обл, г Балашиха',
      status: 'ACTIVE',
      registrationDate: '2004-06-11',
      okved: '47.11',
      type: 'INDIVIDUAL',
    });
  });

  it('sends a POST with the token header and MAIN branch filter', async () => {
    mockFetchJsonResponse(legalPartyResponseFixture);

    await service.findPartyByInn(VALID_LEGAL_INN);

    expect(fetchMock).toHaveBeenCalledWith(DADATA_FIND_PARTY_BY_INN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Token test-api-key',
      },
      body: JSON.stringify({ query: VALID_LEGAL_INN, branch_type: 'MAIN' }),
    });
  });

  it('returns null when suggestions are empty', async () => {
    mockFetchJsonResponse({ suggestions: [] });

    await expect(service.findPartyByInn(VALID_LEGAL_INN)).resolves.toBeNull();
  });

  it('throws INVALID_INN without calling the API', async () => {
    await expect(service.findPartyByInn('1234567890')).rejects.toMatchObject({
      code: DadataExceptionCode.INVALID_INN,
    });
    await expect(service.findPartyByInn('1234567890')).rejects.toBeInstanceOf(
      DadataException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws API_KEY_NOT_CONFIGURED when DADATA_API_KEY is missing', async () => {
    configGetMock.mockReturnValue(undefined);

    await expect(
      service.findPartyByInn(VALID_LEGAL_INN),
    ).rejects.toMatchObject({
      code: DadataExceptionCode.API_KEY_NOT_CONFIGURED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws RATE_LIMITED on HTTP 429', async () => {
    mockFetchJsonResponse({}, 429);

    await expect(
      service.findPartyByInn(VALID_LEGAL_INN),
    ).rejects.toMatchObject({ code: DadataExceptionCode.RATE_LIMITED });
  });

  it('throws FORBIDDEN on HTTP 403', async () => {
    mockFetchJsonResponse({}, 403);

    await expect(
      service.findPartyByInn(VALID_LEGAL_INN),
    ).rejects.toMatchObject({ code: DadataExceptionCode.FORBIDDEN });
  });

  it('throws REQUEST_FAILED on other HTTP errors', async () => {
    mockFetchJsonResponse({}, 500);

    await expect(
      service.findPartyByInn(VALID_LEGAL_INN),
    ).rejects.toMatchObject({ code: DadataExceptionCode.REQUEST_FAILED });
  });

  it('throws REQUEST_FAILED on a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('socket hang up'));

    await expect(
      service.findPartyByInn(VALID_LEGAL_INN),
    ).rejects.toMatchObject({
      code: DadataExceptionCode.REQUEST_FAILED,
      message: expect.stringContaining('socket hang up'),
    });
  });
});
