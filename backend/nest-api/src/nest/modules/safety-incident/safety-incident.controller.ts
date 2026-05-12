import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  Permissions,
  RolePermissionGuard,
} from '../access-control';
import { CreateSafetyIncidentDto, UpdateSafetyIncidentDto } from './dto';
import { SafetyIncidentService } from './safety-incident.service';

@Controller('safety-incident')
@UseGuards(RolePermissionGuard)
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
  @Permissions('write')
  async create(@Body() dto: CreateSafetyIncidentDto, @Req() request: Request) {
    return this.safetyIncidentService.create(dto, this.getRequiredUserId(request));
  }

  @Post('create-public')
  async createPublic(@Body() dto: CreateSafetyIncidentDto) {
    return this.safetyIncidentService.create(dto);
  }

  @Put('updateById/:id')
  @Permissions('write')
  async updateById(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSafetyIncidentDto,
    @Req() request: Request,
  ) {
    return this.safetyIncidentService.updateById(id, dto, this.getRequiredUserId(request));
  }

  @Delete('deleteById/:id')
  @Permissions('delete')
  async deleteById(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.safetyIncidentService.deleteById(id, this.getRequiredUserId(request));
  }

  @Get('getArchived')
  async getArchived() {
    return this.safetyIncidentService.getArchived();
  }

  @Patch('archiveById/:id')
  @Permissions('write')
  async archiveById(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.safetyIncidentService.archiveById(id, this.getRequiredUserId(request));
  }

  @Patch('unarchiveById/:id')
  @Permissions('write')
  async unarchiveById(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.safetyIncidentService.unarchiveById(id, this.getRequiredUserId(request));
  }

  private getRequiredUserId(request: Request | undefined): number {
    const req = request as Request & {
      user?: { id?: number | string };
      headers?: Record<string, string | string[] | undefined>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    };

    const fromUser = Number(req?.user?.id);
    if (Number.isInteger(fromUser) && fromUser > 0) {
      return fromUser;
    }

    const headerValue = req?.headers?.['x-user-id'];
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const fromHeader = Number(normalizedHeader);
    if (Number.isInteger(fromHeader) && fromHeader > 0) {
      return fromHeader;
    }

    const fromQuery = Number(req?.query?.['user_id']);
    if (Number.isInteger(fromQuery) && fromQuery > 0) {
      return fromQuery;
    }

    const fromBody = Number(req?.body?.['user_id']);
    if (Number.isInteger(fromBody) && fromBody > 0) {
      return fromBody;
    }

    throw new ForbiddenException('User context is required for write operations');
  }
}
