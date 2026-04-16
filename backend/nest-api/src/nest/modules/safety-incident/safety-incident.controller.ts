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
} from '@nestjs/common';
import { CreateSafetyIncidentDto, UpdateSafetyIncidentDto } from './dto';
import { SafetyIncidentService } from './safety-incident.service';

@Controller('safety-incident')
export class SafetyIncidentController {
  constructor(private readonly safetyIncidentService: SafetyIncidentService) {}

  @Get('getList')
  async getList(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.safetyIncidentService.getList({
      selectedViewType,
      dateFrom,
      dateTo,
      isAll: isAll === '1' || isAll === 'true',
    });
  }

  @Get('getAll')
  async getAll() {
    return this.safetyIncidentService.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.safetyIncidentService.getById(id);
  }

  @Get('find')
  async find(@Query() query: Record<string, string>) {
    return this.safetyIncidentService.find(query);
  }

  @Get('findOne')
  async findOne(@Query() query: Record<string, string>) {
    return this.safetyIncidentService.findOne(query);
  }

  @Post('create')
  async create(@Body() dto: CreateSafetyIncidentDto) {
    return this.safetyIncidentService.create(dto);
  }

  @Put('updateById/:id')
  async updateById(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSafetyIncidentDto,
  ) {
    return this.safetyIncidentService.updateById(id, dto);
  }

  @Delete('deleteById/:id')
  async deleteById(@Param('id', ParseIntPipe) id: number) {
    return this.safetyIncidentService.deleteById(id);
  }
}
