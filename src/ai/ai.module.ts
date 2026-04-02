import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';

@Global() // Makes AiService available everywhere without re-importing
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}