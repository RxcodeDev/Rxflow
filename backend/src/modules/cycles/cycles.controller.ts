import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';

@Controller('cycles')
@UseGuards(JwtAuthGuard)
export class CyclesController {
  constructor(private readonly svc: CyclesService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  create(@Body() dto: CreateCycleDto) {
    return this.svc.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  /** Add a task to a cycle */
  @Patch(':id/tasks/:taskId')
  @HttpCode(204)
  addTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.svc.addTask(id, taskId);
  }

  /** Remove a task from a cycle */
  @Delete(':id/tasks/:taskId')
  @HttpCode(204)
  removeTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.svc.removeTask(id, taskId);
  }

  /** Add all tasks of an epic to a cycle */
  @Patch(':id/epics/:epicId')
  @HttpCode(204)
  addEpicTasks(@Param('id') id: string, @Param('epicId') epicId: string) {
    return this.svc.addEpicTasks(id, epicId);
  }
}
