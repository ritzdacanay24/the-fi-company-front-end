import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Permissions, RolePermissionGuard } from '../access-control';
import {
  CreateGateCommentDto,
  ProjectManagerService,
  UpsertCustomerOptionsDto,
  UpsertIntakeDto,
  UpsertProjectDto,
  UpsertVolumeEstimateOptionsDto
} from './project-manager.service';

@Controller('operations/project-manager')
@UseGuards(RolePermissionGuard)
export class ProjectManagerController {
  constructor(private readonly service: ProjectManagerService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Post()
  @Permissions('write')
  async upsert(@Body() dto: UpsertProjectDto) {
    return this.service.upsert(dto);
  }

  @Delete(':id')
  @Permissions('write')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get(':id/intake')
  async getIntake(@Param('id') id: string) {
    return this.service.getIntake(id);
  }

  @Put(':id/intake')
  @Permissions('write')
  async upsertIntake(@Param('id') id: string, @Body() dto: UpsertIntakeDto) {
    return this.service.upsertIntake(id, dto);
  }

  @Get('customer-options')
  async getCustomerOptions() {
    return this.service.getCustomerOptions();
  }

  @Put('customer-options')
  @Permissions('write')
  async upsertCustomerOptions(@Body() dto: UpsertCustomerOptionsDto) {
    return this.service.upsertCustomerOptions(dto);
  }

  @Get('volume-estimate-options')
  async getVolumeEstimateOptions() {
    return this.service.getVolumeEstimateOptions();
  }

  @Put('volume-estimate-options')
  @Permissions('write')
  async upsertVolumeEstimateOptions(@Body() dto: UpsertVolumeEstimateOptionsDto) {
    return this.service.upsertVolumeEstimateOptions(dto);
  }

  @Get(':id/gates/:gate/comments')
  async getGateComments(@Param('id') id: string, @Param('gate') gate: string) {
    return this.service.getGateComments(id, Number.parseInt(gate, 10));
  }

  @Post(':id/gates/:gate/comments')
  @Permissions('write')
  async createGateComment(
    @CurrentUserId() currentUserId: number,
    @Param('id') id: string,
    @Param('gate') gate: string,
    @Body() dto: CreateGateCommentDto
  ) {
    return this.service.createGateComment(id, Number.parseInt(gate, 10), dto, currentUserId);
  }

  @Delete(':id/gates/:gate/comments/:commentId')
  @Permissions('write')
  async deleteGateComment(
    @CurrentUserId() currentUserId: number,
    @Param('id') id: string,
    @Param('gate') gate: string,
    @Param('commentId') commentId: string
  ) {
    return this.service.deleteGateComment(
      id,
      Number.parseInt(gate, 10),
      Number.parseInt(commentId, 10),
      currentUserId
    );
  }
}
