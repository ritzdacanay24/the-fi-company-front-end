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
} from '@nestjs/common';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { VehicleService } from './vehicle.service';

@Controller('vehicle')
export class VehicleController {
  constructor(@Inject(VehicleService) private readonly vehicleService: VehicleService) {}

  @Get('getList')
  async getList(@Query('selectedViewType') selectedViewType?: string) {
    return await this.vehicleService.getList({ selectedViewType });
  }

  @Get('getAll')
  async getAll() {
    return await this.vehicleService.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return await this.vehicleService.getById(id);
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return await this.vehicleService.find(query);
  }

  @Get('findOne')
  async findOne(@Query() query: Record<string, unknown>) {
    return await this.vehicleService.findOne(query);
  }

  @Get('checkAnyFailures')
  async checkAnyFailures(@Query('license') license?: string) {
    return await this.vehicleService.checkAnyFailures(license || '');
  }

  @Post('create')
  async create(@Body() payload: CreateVehicleDto) {
    return await this.vehicleService.create(payload);
  }

  @Put('updateById')
  async updateById(@Query('id', ParseIntPipe) id: number, @Body() payload: UpdateVehicleDto) {
    return await this.vehicleService.updateById(id, payload);
  }

  @Delete('deleteById')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return await this.vehicleService.deleteById(id);
  }
}
