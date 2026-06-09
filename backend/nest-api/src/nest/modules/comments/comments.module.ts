import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { CommentRemindersRepository } from './comment-reminders.repository';
import { CommentRemindersService } from './comment-reminders.service';
import { EmailModule } from '@/shared/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentsRepository,
    CommentRemindersRepository,
    CommentRemindersService,
  ],
  exports: [CommentsService, CommentRemindersService],
})
export class CommentsModule {}
