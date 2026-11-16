import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SchoolService } from './school.service';

@ApiTags('school')
@Controller('schools')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  /** S-02 학교 선택 목록 */
  @Get()
  list() {
    return this.schoolService.list();
  }
}
