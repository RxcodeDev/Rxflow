import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { SafeUser } from '../users/entities/user.entity';
import { ImportService, type ImportProjectPayload } from './import.service';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * POST /import/project/:code/preview
   *
   * Validates and normalizes the payload without inserting data.
   * Returns errors and a preview of what would be inserted.
   */
  @Post('project/:code/preview')
  previewImport(
    @Param('code') code: string,
    @Body() body: ImportProjectPayload,
  ): Promise<unknown> {
    return this.importService.previewProjectImport(code, body);
  }

  /**
   * POST /import/project/:code
   *
   * Body: { epics?: ImportEpicDto[], tasks?: ImportTaskDto[] }
   *
   * Creates tasks and/or epics in bulk for the given project.
   * Returns { created_epics, created_tasks, errors[] }.
   */
  @Post('project/:code')
  importProject(
    @Param('code') code: string,
    @Body() body: ImportProjectPayload,
    @CurrentUser() user: SafeUser,
  ) {
    return this.importService.importProject(code, user.id, body);
  }
}
