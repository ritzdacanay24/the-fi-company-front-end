import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { SerialAssignmentsService } from './serial-assignments.service';
import { AssignmentsFilterDto, VoidAssignmentDto, DeleteAssignmentDto, RestoreAssignmentDto, BulkVoidDto } from './dto';

@Controller(['serial-assignments', 'serial-assignments/index.php'])
@UseGuards(RolePermissionGuard)
export class SerialAssignmentsController {
  constructor(private readonly service: SerialAssignmentsService) {}

  // GET /serial-assignments
  @Get()
  async getAssignments(@Query() query: AssignmentsFilterDto) {
    try {
      return await this.service.getAssignments(query);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/stats
  @Get('stats')
  async getStatistics() {
    try {
      return await this.service.getStatistics();
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/audit-trail?limit=100
  @Get('audit-trail')
  async getAuditTrail(@Query('limit') limit?: string) {
    try {
      return await this.service.getAuditTrail(undefined, limit ? parseInt(limit, 10) : 100);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/consumption-trend
  @Get('consumption-trend')
  async getConsumptionTrend() {
    try {
      return await this.service.getDailyConsumptionTrend();
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/user-activity
  @Get('user-activity')
  async getUserActivity() {
    try {
      return await this.service.getUserConsumptionActivity();
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/work-orders?work_order=WO-123
  @Get('work-orders')
  async getWorkOrders(@Query('work_order') workOrder?: string) {
    try {
      return await this.service.getWorkOrderSerials(workOrder);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // POST /serial-assignments/bulk-void
  @Post('bulk-void')
  @Permissions('write')
  async bulkVoid(@Body() dto: BulkVoidDto) {
    try {
      return await this.service.bulkVoid(dto);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/:id
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.service.getAssignmentById(id);
      if (!result.success) throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /serial-assignments/:id/audit
  @Get(':id/audit')
  async getAssignmentAudit(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: string) {
    try {
      return await this.service.getAuditTrail(id, limit ? parseInt(limit, 10) : 100);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // POST /serial-assignments/:id/void
  @Post(':id/void')
  @Permissions('write')
  async voidAssignment(@Param('id', ParseIntPipe) id: number, @Body() dto: VoidAssignmentDto) {
    try {
      return await this.service.voidAssignment(id, dto);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  // POST /serial-assignments/:id/restore
  @Post(':id/restore')
  @Permissions('write')
  async restoreAssignment(@Param('id', ParseIntPipe) id: number, @Body() dto: RestoreAssignmentDto) {
    try {
      return await this.service.restoreAssignment(id, dto);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  // DELETE /serial-assignments/:id
  @Delete(':id')
  @Permissions('delete')
  async deleteAssignment(@Param('id', ParseIntPipe) id: number, @Body() dto: DeleteAssignmentDto) {
    try {
      return await this.service.deleteAssignment(id, dto);
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.BAD_REQUEST);
    }
  }
}
