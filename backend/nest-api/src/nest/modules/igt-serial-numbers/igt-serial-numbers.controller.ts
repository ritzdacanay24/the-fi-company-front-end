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
import { IgtSerialNumbersService } from './igt-serial-numbers.service';
import { CreateIgtSerialDto } from './dto/create-igt-serial.dto';
import { UpdateIgtSerialDto } from './dto/update-igt-serial.dto';
import { BulkUploadOptionsDto } from './dto/bulk-create-igt-serial.dto';

@Controller(['igt-serial-numbers', 'IgtAssets/igt_serial_numbers_crud', 'Quality/igt-serial'])
@UseGuards(RolePermissionGuard)
@Domain('inventory')
export class IgtSerialNumbersController {
  constructor(private readonly service: IgtSerialNumbersService) {}

  // GET /igt-serial-numbers/stats
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  // GET /igt-serial-numbers/available?category=gaming&limit=5000
  @Get('available')
  getAvailable(
    @Query('category') category = 'gaming',
    @Query('limit') limit = '5000',
  ) {
    return this.service.getAvailable(category, parseInt(limit, 10));
  }

  // POST /igt-serial-numbers/check-existing
  @Post('check-existing')
  @Permissions('write')
  checkExisting(@Body('serial_numbers') serialNumbers: string[]) {
    return this.service.checkExisting(serialNumbers);
  }

  // POST /igt-serial-numbers/reserve
  @Post('reserve')
  @Permissions('write')
  reserve(@Body('serial_number') serialNumber: string) {
    return this.service.reserve(serialNumber);
  }

  // POST /igt-serial-numbers/release
  @Post('release')
  @Permissions('write')
  release(@Body('serial_number') serialNumber: string) {
    return this.service.release(serialNumber);
  }

  // POST /igt-serial-numbers/bulk-upload
  @Post('bulk-upload')
  @Permissions('write')
  bulkUploadWithOptions(@Body() dto: BulkUploadOptionsDto) {
    return this.service.bulkUploadWithOptions(dto);
  }

  // POST /igt-serial-numbers/bulk-delete
  @Post('bulk-delete')
  @Permissions('delete')
  bulkDelete(@Body('ids') ids: number[], @Body('hard') hard?: boolean) {
    return hard ? this.service.bulkHardDelete(ids) : this.service.bulkSoftDelete(ids);
  }

  // POST /igt-serial-numbers/bulk
  @Post('bulk')
  @Permissions('write')
  bulkCreate(
    @Body('serials') serials: CreateIgtSerialDto[],
    @Body('duplicateStrategy') duplicateStrategy: 'skip' | 'replace' | 'error' = 'skip',
  ) {
    return this.service.bulkCreate(serials ?? [], duplicateStrategy);
  }

  // GET /igt-serial-numbers
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findAll({
      search,
      status,
      category,
      includeInactive: includeInactive === '1' || includeInactive === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // POST /igt-serial-numbers
  @Post()
  @Permissions('write')
  create(@Body() dto: CreateIgtSerialDto | CreateIgtSerialDto[]) {
    if (Array.isArray(dto)) {
      return this.service.bulkCreate(dto);
    }
    return this.service.create(dto);
  }

  // GET /igt-serial-numbers/:id
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  // PUT /igt-serial-numbers/:id
  @Put(':id')
  @Permissions('write')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIgtSerialDto) {
    return this.service.update(id, dto);
  }

  // DELETE /igt-serial-numbers/:id?hard=true
  @Delete(':id')
  @Permissions('delete')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('hard') hard?: string,
  ) {
    return hard === 'true' ? this.service.hardDelete(id) : this.service.softDelete(id);
  }
}
