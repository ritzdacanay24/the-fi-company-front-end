import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { TripDetailService } from './trip-detail.service';

@Controller('trip-detail')
export class TripDetailController {
  constructor(private readonly service: TripDetailService) {}

  @Get('findByFsId')
  async findByFsId(@Query('id', ParseIntPipe) id: number) {
    return this.service.findByFsId(id);
  }

  @Get('findByGroupFsId')
  async findByGroupFsId(@Query('id', ParseIntPipe) id: number) {
    return this.service.findByGroupFsId(id);
  }
}
