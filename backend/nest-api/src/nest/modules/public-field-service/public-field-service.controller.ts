import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '@/nest/decorators/public.decorator';
import { CreatePublicRequestCommentDto } from './dto/create-public-request-comment.dto';
import { CreatePublicRequestDto } from './dto/create-public-request.dto';
import { PublicFieldServiceService } from './public-field-service.service';
import { PublicRequestTokenGuard } from './public-request-token.guard';

@Public()
@Controller('public/field-service')
export class PublicFieldServiceController {
  constructor(private readonly service: PublicFieldServiceService) {}

  @Post('requests')
  async createRequest(@Body() payload: CreatePublicRequestDto) {
    return this.service.createRequest(payload);
  }

  @Get('requests/:id/status')
  @UseGuards(PublicRequestTokenGuard)
  async getRequestStatus(
    @Param('id', ParseIntPipe) requestId: number,
    @Headers('authorization') authorization?: string,
    @Query('token') queryToken?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : queryToken;
    return this.service.getRequestStatus(requestId, token);
  }

  @Get('requests/:id/comments')
  @UseGuards(PublicRequestTokenGuard)
  async listComments(
    @Param('id', ParseIntPipe) requestId: number,
    @Headers('authorization') authorization?: string,
    @Query('token') queryToken?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : queryToken;
    return this.service.listComments(requestId, token);
  }

  @Post('requests/:id/comments')
  @UseGuards(PublicRequestTokenGuard)
  async createComment(
    @Param('id', ParseIntPipe) requestId: number,
    @Body() payload: CreatePublicRequestCommentDto,
    @Headers('authorization') authorization?: string,
    @Query('token') queryToken?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : queryToken;
    return this.service.createComment(requestId, token, payload);
  }

  @Post('requests/:id/attachments')
  @UseGuards(PublicRequestTokenGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id', ParseIntPipe) requestId: number,
    @UploadedFile() file?: { originalname?: string; size?: number },
    @Headers('authorization') authorization?: string,
    @Query('token') queryToken?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : queryToken;
    return this.service.uploadAttachment(requestId, token, file);
  }

  @Get('requests/:id/attachments')
  @UseGuards(PublicRequestTokenGuard)
  async listAttachments(
    @Param('id', ParseIntPipe) requestId: number,
    @Headers('authorization') authorization?: string,
    @Query('token') queryToken?: string,
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : queryToken;
    return this.service.listAttachments(requestId, token);
  }
}
