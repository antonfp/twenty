import { Injectable } from '@nestjs/common';

import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { InflowDocumentPostingRulesService } from 'src/engine/core-modules/erp-stock/services/inflow-document-posting-rules.service';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';

// Оприходование: inflow like goodsReceipt, but the installed goodsPosting
// object has no total field.
@Injectable()
export class GoodsPostingPostingRulesService extends InflowDocumentPostingRulesService {
  constructor(
    documentNumberingService: DocumentNumberingService,
    itemBalanceService: ItemBalanceService,
  ) {
    super(documentNumberingService, itemBalanceService, {
      objectNameSingular: 'goodsPosting',
      lineObjectNameSingular: 'goodsPostingLine',
      numberPrefix: 'GP',
      documentNameNominative: 'Оприходование',
      updatesDocumentTotal: false,
    });
  }
}
