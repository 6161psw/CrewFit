import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('school')
@Controller('schools')
export class SchoolController {
  constructor(private readonly prisma: PrismaService) {}

  /** S-02 학교 선택 목록 */
  @Get()
  list() {
    return this.prisma.school.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, shortName: true, region: true, emailDomains: true },
    });
  }
}

@Module({ controllers: [SchoolController] })
export class SchoolModule {}
