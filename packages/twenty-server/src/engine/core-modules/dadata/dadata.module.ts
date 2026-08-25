import { Module } from '@nestjs/common';

import { DadataService } from 'src/engine/core-modules/dadata/services/dadata.service';

@Module({
  providers: [DadataService],
  exports: [DadataService],
})
export class DadataModule {}
