import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AiModule } from '../ai/ai.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    AiModule,
    JwtModule, // ✅ added this
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
