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
  UseGuards,
} from '@nestjs/common';
import { Domain, Permissions, RolePermissionGuard } from '../access-control';
import { BulkCreateAgsSerialDto } from './dto/bulk-create-ags-serial.dto';
import { CreateAgsSerialDto } from './dto/create-ags-serial.dto';
import { UpdateAgsSerialDto } from './dto/update-ags-serial.dto';
import { AgsSerialService } from './ags-serial.service';

@Controller(['quality/ags-serial', 'Quality/ags-serial', 'ags-serial'])
@UseGuards(RolePermissionGuard)
@Domain('inventory')
export class AgsSerialController {
  constructor(private readonly agsSerialService: AgsSerialService) {}

  // ── Static routes MUST come before parameterised :id routes ───────────────

  @Get()
  async list(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.agsSerialService.getList({
      selectedViewType,
      dateFrom,
      dateTo,
      isAll: isAll === '1' || isAll === 'true',
    });
  }

  @Get('serials/check')
  async checkSerial(@Query('assetNumber') assetNumber?: string) {
    return this.agsSerialService.checkIfSerialIsFound(assetNumber);
  }

  // ── Parameterised routes ───────────────────────────────────────────────────

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.agsSerialService.getById(id);
  }

  @Post()
  @Permissions('write')
  async createOne(@Body() payload: CreateAgsSerialDto) {
    return this.agsSerialService.create(payload);
  }

  @Post('bulk')
  @Permissions('write')
  async bulkCreate(@Body() payload: BulkCreateAgsSerialDto) {
    return this.agsSerialService.bulkCreate(payload);
  }

  @Put(':id')
  @Permissions('manage')
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateAgsSerialDto,
  ) {
    return this.agsSerialService.updateById(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async deleteOne(@Param('id', ParseIntPipe) id: number) {
    return this.agsSerialService.deleteById(id);
  }
}
