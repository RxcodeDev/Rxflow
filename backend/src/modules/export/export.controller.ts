import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('full')
  async exportFull(@Res() res: Response) {
    const data = await this.exportService.exportAll();
    const json = JSON.stringify(data, null, 2);
    const filename = `rxflow-export-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(json);
  }

  @Get('markdown')
  async exportMarkdown(@Res() res: Response) {
    const md = await this.exportService.exportMarkdown();
    const filename = `rxflow-export-${new Date().toISOString().split('T')[0]}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(md);
  }

  /** Export all data for a single project as a JSON file download */
  @Get('project/:code')
  async exportProject(@Param('code') code: string, @Res() res: Response) {
    const data = await this.exportService.exportProject(code);
    const json = JSON.stringify(data, null, 2);
    const filename = `rxflow-project-${code.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(json);
  }

  /**
   * Returns the reference context an LLM needs to generate a valid import JSON
   * for the given project: member IDs, epic IDs, cycle IDs, valid enum values, schema.
   */
  @Get('project/:code/context')
  async getProjectContext(@Param('code') code: string) {
    return this.exportService.getProjectContext(code);
  }
}
