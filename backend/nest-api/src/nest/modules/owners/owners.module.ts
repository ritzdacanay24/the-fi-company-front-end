import { Module } from '@nestjs/common';
import { OwnersController } from './owners.controller';
import { OwnersRepository } from './owners.repository';
import { OwnersService } from './owners.service';

@Module({
  controllers: [OwnersController],
  providers: [OwnersRepository, OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
