import { Controller, Get, Post } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly svc: SeedService) {}

  @Post()
  seed() {
    return this.svc.seed();
  }

  @Get('status')
  status() {
    return this.svc.status();
  }
}
