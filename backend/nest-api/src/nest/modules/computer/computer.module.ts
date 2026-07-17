import { Module } from '@nestjs/common';
import { ComputerController } from './computer.controller';
import { ComputerRepository } from './computer.repository';
import { ComputerService } from './computer.service';

@Module({
  controllers: [ComputerController],
  providers: [ComputerService, ComputerRepository],
})
export class ComputerModule {}
