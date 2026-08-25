import { gql } from '@apollo/client';

export const POST_ERP_DOCUMENT = gql`
  mutation PostErpDocument($objectNameSingular: String!, $recordId: UUID!) {
    postDocument(objectNameSingular: $objectNameSingular, recordId: $recordId)
  }
`;

export const CANCEL_ERP_DOCUMENT = gql`
  mutation CancelErpDocument($objectNameSingular: String!, $recordId: UUID!) {
    cancelDocument(objectNameSingular: $objectNameSingular, recordId: $recordId)
  }
`;
