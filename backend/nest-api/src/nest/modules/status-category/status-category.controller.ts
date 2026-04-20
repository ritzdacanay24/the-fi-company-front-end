import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
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

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.update(id, payload);
  }
}
