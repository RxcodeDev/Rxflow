import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';

export interface CreateProjectDto {
  name: string;
  code: string;
  description?: string;
  methodology?: string;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findByCode(code: string) {
    const project = await this.repo.findByCode(code);
    if (!project) throw new NotFoundException(`Proyecto '${code}' no encontrado`);
    return project;
  }

  async create(dto: CreateProjectDto, userId: string) {
    return this.repo.create({
      name: dto.name,
      code: dto.code.toUpperCase(),
      description: dto.description,
      methodology: dto.methodology ?? 'kanban',
      createdBy: userId,
    });
  }

  async getEpics(code: string) {
    return this.repo.findEpicsByCode(code);
  }

  async createEpic(code: string, dto: { name: string; description?: string }, userId: string) {
    return this.repo.createEpic(code, dto, userId);
  }

  async getMembers(code: string) {
    return this.repo.findMembersByCode(code);
  }

  async update(id: string, dto: {
    name?: string;
    description?: string | null;
    methodology?: string;
    status?: string;
    extra_views?: string[];
  }) {
    return this.repo.updateById(id, dto);
  }

  async deleteById(id: string) {
    await this.repo.deleteById(id);
  }
}
