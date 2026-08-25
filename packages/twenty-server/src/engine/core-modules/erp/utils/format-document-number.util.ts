export const formatDocumentNumber = (
  prefix: string,
  sequenceNumber: number,
): string => {
  return `${prefix}-${String(sequenceNumber).padStart(6, '0')}`;
};
