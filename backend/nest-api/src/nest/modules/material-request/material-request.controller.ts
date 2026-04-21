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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MaterialRequestService } from './material-request.service';

@Controller('material-request')
export class MaterialRequestController {
  constructor(private readonly service: MaterialRequestService) {}

  @Get('getList')
  async getList(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.service.getList({ selectedViewType, dateFrom, dateTo, isAll });
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getAll')
  async getAll() {
    return this.service.getAll();
  }

  @Get('getHeader')
  async getHeader(@Query('id', ParseIntPipe) id: number) {
    return this.service.getHeader(id);
  }

  @Get('getById')
  async getByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('getById/:id')
  async getByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  async create(@Body() payload: Record<string, unknown>, @Req() req: Request) {
    const userId = (req as Request & { user?: { id?: number } }).user?.id;
    return this.service.create(payload, userId);
  }

  @Put('updateById')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById/:id')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById/:id')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Get('getValidation')
  async getValidation() {
    return this.service.getValidation();
  }

  @Get('getPicking')
  async getPicking() {
    return this.service.getPicking();
  }

  @Get('searchItemByQadPartNumber')
  async searchItemByQadPartNumber(
    @Query('searchItemByQadPartNumber') rawItems?: string,
  ) {
    return this.service.searchItemByQadPartNumber(rawItems);
  }

  @Post('sendBackToValidation')
  async sendBackToValidation(@Body() payload: { id: number }) {
    return this.service.sendBackToValidation(Number(payload.id));
  }

  @Post('onPrint')
  async onPrint(@Body() payload: { data: Array<Record<string, unknown>> }) {
    return this.service.onPrint(Array.isArray(payload.data) ? payload.data : []);
  }

  @Post('clearPrint')
  async clearPrint(@Body() payload: { data: Array<Record<string, unknown>> }) {
    return this.service.clearPrint(Array.isArray(payload.data) ? payload.data : []);
  }

  @Post('completePicking')
  async completePicking(
    @Body()
    payload: {
      id: number;
      data: Array<Record<string, unknown>>;
      pickedCompletedDate: string;
    },
  ) {
    return this.service.completePicking(payload);
  }

  @Get('getAllWithStatus')
  async getAllWithStatus() {
    return this.service.getAllWithStatus();
  }

  @Put('updateStatus')
  async updateStatus(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: { status: string; updatedBy?: number },
  ) {
    return this.service.updateStatus(id, payload.status, payload.updatedBy);
  }

  @Delete('deleteLineItem')
  async deleteLineItem(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteLineItem(id);
  }

  @Post('automatedIGTTransfer')
  async automatedIGTTransfer() {
    return {
      success: false,
      message: 'automatedIGTTransfer is not available in apiV2 yet',
      rowCount: 0,
    };
  }
}
