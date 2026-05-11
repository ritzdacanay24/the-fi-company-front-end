import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@/nest/decorators/public.decorator';
import { SupportTicketsService } from './support-tickets.service';
import { CreateSupportTicketDto } from './support-tickets.types';

@Controller('public/support-tickets')
@Public()
export class SupportTicketsPublicController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  async create(@Body() dto: CreateSupportTicketDto & { submitter_name?: string; submitter_email?: string }) {
    return this.supportTicketsService.createPublic(dto);
  }
}
