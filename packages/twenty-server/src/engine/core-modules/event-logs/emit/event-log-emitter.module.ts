import { Module } from '@nestjs/common';

import { EventLogEmitterResolver } from 'src/engine/core-modules/event-logs/emit/event-log-emitter.resolver';
import { EventLogEmitterService } from 'src/engine/core-modules/event-logs/emit/event-log-emitter.service';
import { EventLogIngestionModule } from 'src/engine/core-modules/event-logs/ingest/event-log-ingestion.module';

@Module({
  imports: [EventLogIngestionModule],
  providers: [EventLogEmitterService, EventLogEmitterResolver],
  exports: [EventLogEmitterService],
})
export class EventLogEmitterModule {}
