import { CancelErpDocumentCommand } from '@/erp-documents/components/CancelErpDocumentCommand';
import { PostErpDocumentCommand } from '@/erp-documents/components/PostErpDocumentCommand';
import { PrintErpSalesInvoiceCommand } from '@/erp-documents/components/PrintErpSalesInvoiceCommand';
import { PrintErpSalesShipmentUpdCommand } from '@/erp-documents/components/PrintErpSalesShipmentUpdCommand';
import { ERP_ENGINE_COMPONENT_KEYS } from '@/erp-documents/constants/ErpEngineComponentKeys';

// Checked by CommandRunner before the generated engine component map, because
// these keys are client-only and absent from the EngineComponentKey enum.
export const ERP_ENGINE_COMPONENT_KEY_COMPONENT_MAP: Record<
  string,
  React.ReactNode
> = {
  [ERP_ENGINE_COMPONENT_KEYS.POST_DOCUMENT]: <PostErpDocumentCommand />,
  [ERP_ENGINE_COMPONENT_KEYS.CANCEL_DOCUMENT]: <CancelErpDocumentCommand />,
  [ERP_ENGINE_COMPONENT_KEYS.PRINT_SALES_INVOICE]: (
    <PrintErpSalesInvoiceCommand />
  ),
  [ERP_ENGINE_COMPONENT_KEYS.PRINT_SALES_SHIPMENT_UPD]: (
    <PrintErpSalesShipmentUpdCommand />
  ),
};
