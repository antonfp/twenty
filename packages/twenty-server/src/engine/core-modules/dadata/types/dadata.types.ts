export type DadataPartyType = 'LEGAL' | 'INDIVIDUAL';

export type DadataPartyStatus =
  | 'ACTIVE'
  | 'LIQUIDATING'
  | 'LIQUIDATED'
  | 'BANKRUPT'
  | 'REORGANIZING';

export type DadataPartyResult = {
  inn: string;
  // null for individual entrepreneurs (ИП) — КПП only exists for legal entities
  kpp: string | null;
  ogrn: string;
  shortName: string;
  fullName: string;
  opfShort: string;
  managementName: string | null;
  managementPost: string | null;
  legalAddress: string;
  status: DadataPartyStatus;
  // ISO date (YYYY-MM-DD)
  registrationDate: string | null;
  okved: string | null;
  type: DadataPartyType;
};
