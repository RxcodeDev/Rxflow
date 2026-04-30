import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesRepository } from './workspaces.repository';

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly repo: WorkspacesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  findAllForUser(userId: string) {
    return this.repo.findAllForUser(userId);
  }

  async findById(id: string) {
    const ws = await this.repo.findById(id);
    if (!ws) throw new NotFoundException(`Espacio de trabajo '${id}' no encontrado`);
    return ws;
  }

  create(dto: CreateWorkspaceDto, userId: string) {
    return this.repo.create({
      name: dto.name,
      description: dto.description,
      color: dto.color ?? '#6366f1',
      icon: dto.icon ?? 'layers',
      createdBy: userId,
    });
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    await this.findById(id);
    await this.repo.updateById(id, dto);
    return this.repo.findById(id);
  }

  async deleteById(id: string) {
    await this.findById(id);
    await this.repo.deleteById(id);
  }

  async addProject(id: string, projectId: string) {
    await this.findById(id);
    await this.repo.addProject(id, projectId);
    return this.repo.findById(id);
  }

  async removeProject(id: string, projectId: string) {
    await this.findById(id);
    await this.repo.removeProject(id, projectId);
  }

  async addMember(id: string, userId: string) {
    await this.findById(id);
    await this.repo.addMember(id, userId);
  }

  async removeMember(id: string, userId: string) {
    await this.findById(id);
    await this.repo.removeMember(id, userId);
  }

  findUnassignedProjects() {
    return this.repo.findUnassignedProjects();
  }
}
