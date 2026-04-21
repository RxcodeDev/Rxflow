import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

@Module({
  providers: [SeedService],
  controllers: [SeedController],
})
export class SeedModule {}
