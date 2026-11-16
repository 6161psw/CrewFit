import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/types/auth-user.type';
import { canManageContest } from '../common/utils/scope.util';
import { AdminRepository } from './admin.repository';

/** 관리 범위 검사 공용 */
@Injectable()
export class AdminAccessService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async contest(user: AuthUser, id: number) {
    const c = await this.adminRepository.findContest(id);
    if (!c || !canManageContest(user, c)) throw new NotFoundException('공고 없음');
    return c;
  }

  async submission(user: AuthUser, id: number) {
    const s = await this.adminRepository.findSubmission(id);
    if (!s || !canManageContest(user, s.contest)) throw new NotFoundException('제출 건 없음');
    return s;
  }
}
