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
  CreateComputerDto,
  CreateComputerMaintenanceDto,
  UpdateComputerDto,
  UpdateComputerMaintenanceDto,
} from './dto';
import { ComputerService } from './computer.service';

@Controller('computer')
@UseGuards(RolePermissionGuard)
export class ComputerController {
  constructor(@Inject(ComputerService) private readonly computerService: ComputerService) {}

  @Get('getList')
  async getList(@Query('selectedViewType') selectedViewType?: string) {
    return await this.computerService.getList({ selectedViewType });
  }

  @Get('getAll')
  async getAll() {
    return await this.computerService.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return await this.computerService.getById(id);
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return await this.computerService.find(query);
  }

  @Get('findOne')
  async findOne(@Query() query: Record<string, unknown>) {
    return await this.computerService.findOne(query);
  }

  @Get('inspectionOptions')
  async getInspectionOptions() {
    return await this.computerService.getInspectionOptions();
  }

  @Get('maintenance')
  async getMaintenanceByComputerId(@Query('computer_id', ParseIntPipe) computerId: number) {
    return await this.computerService.getMaintenanceByComputerId(computerId);
  }

  @Post('maintenance')
  @Permissions('write')
  async createMaintenance(@Body() payload: CreateComputerMaintenanceDto) {
    return await this.computerService.createMaintenance(payload);
  }

  @Put('maintenance')
  @Permissions('write')
  async updateMaintenance(@Body() payload: UpdateComputerMaintenanceDto) {
    return await this.computerService.updateMaintenance(payload);
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: CreateComputerDto) {
    return await this.computerService.create(payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateById(@Query('id', ParseIntPipe) id: number, @Body() payload: UpdateComputerDto) {
    return await this.computerService.updateById(id, payload);
  }

  @Delete('deleteById')
  @Permissions('delete')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return await this.computerService.deleteById(id);
  }
}
