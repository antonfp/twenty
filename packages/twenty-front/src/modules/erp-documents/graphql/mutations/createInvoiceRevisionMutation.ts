import { gql } from '@apollo/client';

export const CREATE_INVOICE_REVISION = gql`
  mutation CreateInvoiceRevision($recordId: UUID!) {
    createInvoiceRevision(recordId: $recordId)
  }
`;
