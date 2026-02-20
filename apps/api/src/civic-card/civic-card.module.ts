import { Module } from '@nestjs/common';
import { CivicCardController } from './civic-card.controller';
import { CivicCardService } from './civic-card.service';

@Module({
  controllers: [CivicCardController],
  providers: [CivicCardService]
})
export class CivicCardModule {}
