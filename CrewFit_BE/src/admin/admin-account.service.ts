import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { toSkip } from '../common/dto/pagination.dto';
import { AuthUser } from '../common/types/auth-user.type';
import { AdminRepository } from './admin.repository';
import { AdminUserQuery, CreateInviteDto, RedeemInviteDto, UpdateAdminMeDto, UpdateLicenseDto, UpdateUserRoleDto } from './dto/req/admin-account.dto';

const inviteCode = () => randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, 'X').slice(0, 8);

@Injectable()
export class AdminAccountService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async me(user: AuthUser) {
    const u = await this.adminRepository.findUser(user.id);
    if (!u) throw new NotFoundException();
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.adminDepartment,
      school: u.adminSchool ? { id: u.adminSchool.id, name: u.adminSchool.name, shortName: u.adminSchool.shortName } : null,
      licenseExpiresAt: u.adminSchool?.licenseExpiresAt ?? null,
    };
  }

  async updateMe(user: AuthUser, dto: UpdateAdminMeDto) {
    await this.adminRepository.updateUser(user.id, { name: dto.name, adminDepartment: dto.department });
    return this.me(user);
  }

  /** 관리자 초대 코드 발급 (학교 담당자 → 같은 학교 동료 / SUPER → 아무 학교) */
  async createInvite(user: AuthUser, dto: CreateInviteDto) {
    const schoolId = user.role === UserRole.SUPER_ADMIN ? dto.schoolId : user.adminSchoolId;
    if (!schoolId) throw new BadRequestException('schoolId 필요');
    return this.adminRepository.createInvite({
      code: inviteCode(),
      schoolId,
      department: dto.department ?? null,
      createdById: user.id,
      expiresAt: new Date(Date.now() + dto.expiresInDays * 86_400_000),
    });
  }

  listInvites(user: AuthUser) {
    return this.adminRepository.listInvites(user.role === UserRole.SUPER_ADMIN ? {} : { schoolId: user.adminSchoolId ?? -1 });
  }

  /** 초대 코드로 학교 관리자 되기 (W-01 '관리자 초대 코드로 시작하기') */
  async redeem(user: AuthUser, dto: RedeemInviteDto) {
    const inv = await this.adminRepository.findInvite(dto.code.trim().toUpperCase());
    if (!inv || inv.usedById || inv.expiresAt < new Date()) throw new BadRequestException('유효하지 않은 초대 코드');
    if (user.role === UserRole.SUPER_ADMIN) throw new BadRequestException('이미 최고 관리자');
    await this.adminRepository.redeemInvite(inv.id, user.id, inv.schoolId, inv.department);
    return { ok: true, role: UserRole.SCHOOL_ADMIN, adminSchoolId: inv.schoolId };
  }

  // ---------- SUPER_ADMIN ----------

  async listUsers(q: AdminUserQuery) {
    const where: Prisma.UserWhereInput = q.q
      ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] }
      : {};
    const [items, total] = await this.adminRepository.listUsers(where, toSkip(q), q.limit);
    return { items, total, page: q.page, limit: q.limit };
  }

  updateRole(user: AuthUser, id: string, dto: UpdateUserRoleDto) {
    if (id === user.id) throw new ForbiddenException('자기 권한은 바꿀 수 없어요');
    if (dto.role === UserRole.SCHOOL_ADMIN && !dto.adminSchoolId) throw new BadRequestException('adminSchoolId 필요');
    return this.adminRepository.updateUser(id, {
      role: dto.role,
      adminSchool: dto.role === UserRole.SCHOOL_ADMIN ? { connect: { id: dto.adminSchoolId } } : { disconnect: true },
    });
  }

  updateLicense(schoolId: number, dto: UpdateLicenseDto) {
    return this.adminRepository.updateSchool(schoolId, { licenseExpiresAt: new Date(dto.licenseExpiresAt) });
  }
}
