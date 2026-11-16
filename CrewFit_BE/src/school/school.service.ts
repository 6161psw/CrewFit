import { Injectable } from '@nestjs/common';
import { SchoolRepository } from './school.repository';

@Injectable()
export class SchoolService {
  constructor(private readonly schoolRepository: SchoolRepository) {}

  list() {
    return this.schoolRepository.findAll();
  }
}
