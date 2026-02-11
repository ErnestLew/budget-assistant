import { Controller, Get, Post, Patch, Delete, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { CurrentUserId } from '../decorators/current-user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject('CORE_SERVICE') private coreClient: ClientProxy,
  ) {}

  @Get()
  async listCategories(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.LIST_CATEGORIES, { userId }),
    );
  }

  @Post()
  async createCategory(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.CREATE_CATEGORY, { userId, data: body }),
    );
  }

  @Patch(':id')
  async updateCategory(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.UPDATE_CATEGORY, { categoryId: id, data: body }),
    );
  }

  @Delete(':id')
  async deleteCategory(@CurrentUserId() userId: string, @Param('id') id: string) {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.DELETE_CATEGORY, { categoryId: id }),
    );
  }
}
