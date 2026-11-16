import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.school.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, shortName: true, region: true, emailDomains: true },
    });
  }

  findById(id: number) {
    return this.prisma.school.findUnique({ where: { id } });
  }
}
