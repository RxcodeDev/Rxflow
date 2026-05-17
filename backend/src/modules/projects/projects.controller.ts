import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';

interface CreateProjectDto {
  name: string;
  code: string;
  description?: string;
  methodology?: string;
  extra_views?: string[];
}

interface UpdateProjectDto {
  name?: string;
  description?: string | null;
  methodology?: string;
  status?: string;
  extra_views?: string[];
}

interface CreateEpicDto {
  name: string;
  description?: string;
  parent_epic_id?: string | null;
}

interface UpdateEpicDto {
  name?: string;
  description?: string | null;
  status?: string;
  parent_epic_id?: string | null;
}

interface AuthUser { id: string }

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.svc.findAll(user.id);
  }

  @Get(':code/epics')
  getEpics(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.svc.getEpics(code, user.id);
  }

  @Post(':code/epics')
  createEpic(
    @Param('code') code: string,
    @Body() dto: CreateEpicDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.createEpic(code, dto, user.id);
  }

  @Patch(':code/epics/:epicId')
  updateEpic(
    @Param('epicId') epicId: string,
    @Body() dto: UpdateEpicDto,
  ) {
    return this.svc.updateEpic(epicId, dto);
  }

  @Delete(':code/epics/:epicId')
  @HttpCode(204)
  async deleteEpic(@Param('epicId') epicId: string) {
    await this.svc.deleteEpic(epicId);
  }

  @Get(':code/members')
  getMembers(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.svc.getMembers(code, user.id);
  }

  @Get(':code')
  findOne(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.svc.findByCode(code, user.id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteOne(@Param('id') id: string) {
    await this.svc.deleteById(id);
  }
}
