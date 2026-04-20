import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
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
  async create(@Body() body: Record<string, unknown>) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.update(id, body);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email?: string; newPassword?: string }) {
    if (!body.email || !body.newPassword) {
      throw new BadRequestException('email and newPassword are required');
    }
    return this.usersService.resetPassword(body.email, body.newPassword);
  }
}
