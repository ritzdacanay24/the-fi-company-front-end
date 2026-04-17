import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GraphicsBomService } from './graphics-bom.service';

@Controller('graphics-bom')
export class GraphicsBomController {
  constructor(private readonly service: GraphicsBomService) {}

  @Get('getList')
  async getList() {
    return this.service.getList();
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getAll')
  async getAll() {
    return this.service.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put('updateById')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById/:id')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById/:id')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: { originalname?: string; buffer: Buffer }) {
    return this.service.upload(file);
  }
}
