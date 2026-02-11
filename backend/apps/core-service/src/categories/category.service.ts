import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@budget-assistant-api/prisma-client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new RpcException('Category not found');
    }
    return category;
  }

  async getAll(userId: string) {
    // Return default categories + user's custom categories, ordered by name
    return this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDefaultCategoryMap(): Promise<Map<string, string>> {
    const defaults = await this.prisma.category.findMany({
      where: { isDefault: true },
    });
    const map = new Map<string, string>();
    for (const cat of defaults) {
      map.set(cat.name.toLowerCase(), cat.id);
    }
    return map;
  }

  async getByName(name: string) {
    return this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  async create(
    userId: string,
    data: {
      name: string;
      icon?: string;
      color?: string;
      parentId?: string;
    },
  ) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon ?? null,
        color: data.color ?? '#6B7280',
        parentId: data.parentId ?? null,
        userId,
        isDefault: false,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      icon?: string;
      color?: string;
      parentId?: string;
    },
  ) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new RpcException('Category not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    return this.prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new RpcException('Category not found');
    }
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }
}
