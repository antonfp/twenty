export const DOC_STATUS = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

export type DocStatus = (typeof DOC_STATUS)[keyof typeof DOC_STATUS];
