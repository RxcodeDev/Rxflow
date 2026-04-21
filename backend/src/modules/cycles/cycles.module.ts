import { Module } from '@nestjs/common';
import { CyclesRepository } from './cycles.repository';
import { CyclesService } from './cycles.service';
import { CyclesController } from './cycles.controller';

@Module({
  providers: [CyclesRepository, CyclesService],
  controllers: [CyclesController],
  exports: [CyclesRepository, CyclesService],
})
export class CyclesModule {}
