import { Module } from '@nestjs/common';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

@Module({
  providers: [NotesRepository, NotesService],
  exports: [NotesService],
})
export class NotesModule {}
