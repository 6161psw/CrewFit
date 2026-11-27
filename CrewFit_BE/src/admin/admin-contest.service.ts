import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ContestScope, ContestSource, UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user.type';
import { CATEGORY_LABEL } from '../common/utils/labels';
import { adminContestWhere } from '../common/utils/scope.util';
import { AdminAccessService } from './admin-access.service';
import { AdminRepository } from './admin.repository';
import { CreateContestDto } from './dto/req/create-contest.dto';
import { UpdateContestDto } from './dto/req/update-contest.dto';

@Injectable()
export class AdminContestService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly access: AdminAccessService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.adminRepository.findContests(adminContestWhere(user));
    return rows.map((c) => ({ ...c, categoryLabel: CATEGORY_LABEL[c.category] }));
  }

  async create(user: AuthUser, dto: CreateContestDto) {
    const scope = await this.resolveScope(user, dto.scope, dto.schoolId, dto.region);
    this.assertTeamSize(dto.minTeamSize, dto.maxTeamSize);
    const { requiredDocuments, schoolId: _s, region: _r, ...rest } = dto;
    return this.adminRepository.createContest({
      ...rest,
      ...scope,
      tags: dto.tags ?? [],
      description: dto.description ?? '',
      deadline: new Date(dto.deadline),
      applyStartAt: dto.applyStartAt ? new Date(dto.applyStartAt) : undefined,
      createdById: user.id,
      requiredDocuments: requiredDocuments?.length ? { create: requiredDocuments.map((d, order) => ({ ...d, order })) } : undefined,
    });
  }

  async update(user: AuthUser, id: number, dto: UpdateContestDto) {
    const c = await this.access.contest(user, id);
    const scope = dto.scope ? await this.resolveScope(user, dto.scope, dto.schoolId, dto.region) : {};
    this.assertTeamSize(dto.minTeamSize ?? c.minTeamSize, dto.maxTeamSize ?? c.maxTeamSize);
    const { requiredDocuments, schoolId: _s, region: _r, ...rest } = dto;
    return this.adminRepository.updateContest(
      id,
      {
        ...rest,
        ...scope,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        applyStartAt: dto.applyStartAt ? new Date(dto.applyStartAt) : undefined,
      },
      requiredDocuments,
    );
  }

  /** 팀이 있으면 마감(CLOSED), 없으면 삭제 */
  async remove(user: AuthUser, id: number) {
    const c = await this.access.contest(user, id);
    // 수집 공고는 지우면 다음 수집 때 다시 생김 → 마감 처리
    if (c.source !== ContestSource.MANUAL || (await this.adminRepository.countTeams(id))) {
      await this.adminRepository.closeContest(id);
      return { closed: true };
    }
    await this.adminRepository.deleteContest(id);
    return { deleted: true };
  }

  private assertTeamSize(min: number, max: number) {
    if (min > max) throw new BadRequestException('minTeamSize ≤ maxTeamSize');
  }

  /** SCHOOL_ADMIN: 교내=자기 학교, 연합=자기 학교 지역, 전국 불가 */
  private async resolveScope(user: AuthUser, scope: ContestScope, schoolId?: number, region?: string) {
    if (user.role === UserRole.SUPER_ADMIN) {
      if (scope === ContestScope.SCHOOL && !schoolId) throw new BadRequestException('schoolId 필요');
      if (scope === ContestScope.REGION && !region) throw new BadRequestException('region 필요');
      return {
        scope,
        schoolId: scope === ContestScope.SCHOOL ? schoolId! : null,
        region: scope === ContestScope.REGION ? region! : null,
      };
    }
    if (!user.adminSchoolId) throw new ForbiddenException();
    if (scope === ContestScope.NATIONAL) throw new ForbiddenException('전국 공고는 관리자만');
    const school = await this.adminRepository.findSchool(user.adminSchoolId);
    if (!school) throw new ForbiddenException();
    return { scope, schoolId: school.id, region: scope === ContestScope.REGION ? school.region : null };
  }
}
