import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import {
  CreateForkliftDto,
  CreateForkliftMaintenanceDto,
  UpdateForkliftDto,
  UpdateForkliftMaintenanceDto,
} from './dto';
import { ForkliftService } from './forklift.service';

@Controller('forklift')
@UseGuards(RolePermissionGuard)
export class ForkliftController {
  constructor(@Inject(ForkliftService) private readonly forkliftService: ForkliftService) {}

  @Get('getList')
  async getList(@Query('selectedViewType') selectedViewType?: string) {
    return await this.forkliftService.getList({ selectedViewType });
  }

  @Get('getAll')
  async getAll() {
    return await this.forkliftService.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return await this.forkliftService.getById(id);
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return await this.forkliftService.find(query);
  }

  @Get('findOne')
  async findOne(@Query() query: Record<string, unknown>) {
    return await this.forkliftService.findOne(query);
  }

  @Get('inspectionOptions')
  async getInspectionOptions() {
    return await this.forkliftService.getInspectionOptions();
  }

  @Get('maintenance')
  async getMaintenanceByForkliftId(@Query('forklift_id', ParseIntPipe) forkliftId: number) {
    return await this.forkliftService.getMaintenanceByForkliftId(forkliftId);
  }

  @Post('maintenance')
  @Permissions('write')
  async createMaintenance(@Body() payload: CreateForkliftMaintenanceDto) {
    return await this.forkliftService.createMaintenance(payload);
  }

  @Put('maintenance')
  @Permissions('write')
  async updateMaintenance(@Body() payload: UpdateForkliftMaintenanceDto) {
    return await this.forkliftService.updateMaintenance(payload);
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: CreateForkliftDto) {
    return await this.forkliftService.create(payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateById(@Query('id', ParseIntPipe) id: number, @Body() payload: UpdateForkliftDto) {
    return await this.forkliftService.updateById(id, payload);
  }

  @Delete('deleteById')
  @Permissions('delete')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return await this.forkliftService.deleteById(id);
  }
}
