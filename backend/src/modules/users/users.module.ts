import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports:     [MailModule],
  providers:   [UsersRepository, UsersService],
  controllers: [UsersController],
  exports:     [UsersRepository, UsersService],
})
export class UsersModule {}
