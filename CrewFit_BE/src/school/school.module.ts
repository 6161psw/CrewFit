import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolRepository } from './school.repository';
import { SchoolService } from './school.service';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService, SchoolRepository],
  exports: [SchoolService, SchoolRepository],
})
export class SchoolModule {}
