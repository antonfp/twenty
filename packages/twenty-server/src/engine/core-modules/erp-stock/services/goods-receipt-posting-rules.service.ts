import { Injectable } from '@nestjs/common';

import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { InflowDocumentPostingRulesService } from 'src/engine/core-modules/erp-stock/services/inflow-document-posting-rules.service';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';

@Injectable()
export class GoodsReceiptPostingRulesService extends InflowDocumentPostingRulesService {
  constructor(
    documentNumberingService: DocumentNumberingService,
    itemBalanceService: ItemBalanceService,
  ) {
    super(documentNumberingService, itemBalanceService, {
      objectNameSingular: 'goodsReceipt',
      lineObjectNameSingular: 'goodsReceiptLine',
      numberPrefix: 'GR',
      documentNameNominative: 'Поступление',
      updatesDocumentTotal: true,
    });
  }
}
