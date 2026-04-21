import { Injectable, NotFoundException } from '@nestjs/common';
import { CyclesRepository } from './cycles.repository';
import type { CreateCycleDto } from './dto/create-cycle.dto';

@Injectable()
export class CyclesService {
  constructor(private readonly repo: CyclesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const cycle = await this.repo.findById(id);
    if (!cycle) throw new NotFoundException('Cycle no encontrado');
    return cycle;
  }

  create(dto: CreateCycleDto) {
    return this.repo.create(dto);
  }

  addTask(cycleId: string, taskId: string) {
    return this.repo.addTask(cycleId, taskId);
  }

  removeTask(cycleId: string, taskId: string) {
    return this.repo.removeTask(cycleId, taskId);
  }

  addEpicTasks(cycleId: string, epicId: string) {
    return this.repo.addEpicTasks(cycleId, epicId);
  }
}
