import { Module } from '@nestjs/common';
import { OwnersRepository } from './owners.repository';
import { OwnersService } from './owners.service';

@Module({
  providers: [OwnersRepository, OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
