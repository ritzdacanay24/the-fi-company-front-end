import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions, RolePermissionGuard } from '../access-control';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolePermissionGuard)
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Get('getList')
  async getList(@Query('active') activeRaw?: string) {
    const active = activeRaw !== undefined ? Number(activeRaw) : undefined;
    return this.usersService.getList(active);
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.usersService.find(query);
  }

  @Get('search')
  async search(@Query('text') text?: string) {
    return this.usersService.search(text || '');
  }

  @Get('getUserWithTechRate')
  async getUserWithTechRate() {
    return this.usersService.getUserWithTechRate();
  }

  @Get('getUserWithTechRateById')
  async getUserWithTechRateById(@Query('id', ParseIntPipe) id: number) {
    return this.usersService.getUserWithTechRateById(id);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getById(id);
  }

  @Post()
  @Permissions('manage')
  async create(@Body() body: Record<string, unknown>) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Permissions('manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.update(id, body);
  }

  @Post('reset-password')
  @Permissions('manage')
  async resetPassword(@Body() body: { email?: string; newPassword?: string }) {
    if (!body.email || !body.newPassword) {
      throw new BadRequestException('email and newPassword are required');
    }
    return this.usersService.resetPassword(body.email, body.newPassword);
  }

  @Post(':id/photo')
  @Permissions('manage')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    return this.usersService.uploadPhoto(id, file);
  }
}
