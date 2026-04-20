import { Controller, Get, Query } from '@nestjs/common';
import { StatusCategoryService } from './status-category.service';

@Controller('status-category')
export class StatusCategoryController {
  constructor(private readonly service: StatusCategoryService) {}

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get()
  async getAll() {
    return this.service.getAll();
  }
}
