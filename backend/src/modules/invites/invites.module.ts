import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InvitesController } from './invites.controller';
import { LicensesModule } from '../licenses/licenses.module';
import { jwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    LicensesModule,
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: jwtConfig.expiresIn },
    }),
  ],
  controllers: [InvitesController],
})
export class InvitesModule {}
