import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LicensesService } from '../licenses/licenses.service';
import { AcceptInviteDto } from '../licenses/dto/licenses.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('invites')
export class InvitesController {
  constructor(
    private readonly licensesService: LicensesService,
    private readonly jwtService: JwtService,
  ) {}

  @Get(':token')
  getInvite(@Param('token') token: string) {
    return this.licensesService.getInviteByToken(token);
  }

  @Post(':token/accept')
  async acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    const user = await this.licensesService.acceptInvite(token, dto.name, dto.email, dto.password);
    const licenseRole = await this.licensesService.getUserLicenseRole(user.id);
    const access_token = this.jwtService.sign({ sub: user.id, email: user.email, name: user.name, role: user.role ?? 'member' });
    return { user: { ...user, licenseRole }, access_token };
  }
}
