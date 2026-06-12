import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { EquipmentPrintersService, PrinterData } from './equipment-printers.service';

@Controller('equipment-printers')
@UseGuards(RolePermissionGuard)
export class EquipmentPrintersController {
  constructor(private readonly service: EquipmentPrintersService) {}

  @Get('alert-settings')
  async getAlertSettings() {
    return this.service.getAlertSettings();
  }

  @Put('alert-settings')
  async updateAlertSettings(@Body() payload: Record<string, unknown>) {
    return this.service.updateAlertSettings(payload);
  }

  @Get()
  async getPrinters() {
    return this.service.getAllPrinters();
  }

  @Post()
  async createPrinter(@Body() payload: Record<string, unknown>) {
    return this.service.createPrinter(payload);
  }

  @Put(':id')
  async updatePrinter(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updatePrinter(id, payload);
  }

  @Get('status')
  async getPrintersStatus(): Promise<PrinterData[]> {
    return this.service.getAllPrintersStatus();
  }
}
