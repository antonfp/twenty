import { gql } from '@apollo/client';

export const CREATE_INVOICE_FROM_OPPORTUNITY = gql`
  mutation CreateInvoiceFromOpportunity($opportunityId: UUID!) {
    createInvoiceFromOpportunity(opportunityId: $opportunityId)
  }
`;
