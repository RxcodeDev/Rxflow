import { Controller, Get, Res, UseGuards } from '@nestjs/common';
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
}
