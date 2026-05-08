import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WikiService } from './wiki.service';
import type { WikiTreeNode } from './wiki.types';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import type { SafeUser } from '../users/entities/user.entity';

@Controller('wiki')
@UseGuards(JwtAuthGuard)
export class WikiController {
  constructor(private readonly svc: WikiService) {}

  // ── List / search ─────────────────────────────────────────────────────────────

  @Get()
  findAll(@Query('workspaceId') workspaceId: string, @CurrentUser() user: SafeUser) {
    return this.svc.findAll(workspaceId, user.id);
  }

  @Get('tree')
  findTree(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<WikiTreeNode[]> {
    return this.svc.findTree(workspaceId, user.id);
  }

  @Get('search')
  search(
    @Query('workspaceId') workspaceId: string,
    @Query('q') q: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.search(workspaceId, user.id, q ?? '');
  }

  // ── Filtered views — must come BEFORE :id to avoid route shadowing ────────────

  @Get('by-project/:projectCode')
  findByProject(
    @Param('projectCode') projectCode: string,
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.findByProject(projectCode, workspaceId, user.id);
  }

  @Get('by-epic/:epicId')
  findByEpic(
    @Param('epicId') epicId: string,
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.findByEpic(epicId, workspaceId, user.id);
  }

  @Get('by-task/:taskId')
  findByTask(
    @Param('taskId') taskId: string,
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.findByTask(taskId, workspaceId, user.id);
  }

  // ── Single page ──────────────────────────────────────────────────────────────

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.svc.findById(id, user.id);
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateWikiPageDto, @CurrentUser() user: SafeUser) {
    return this.svc.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWikiPageDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    await this.svc.remove(id, user.id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.svc.archive(id, user.id);
  }
}
