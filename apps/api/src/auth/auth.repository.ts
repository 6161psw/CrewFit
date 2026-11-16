import { Injectable } from '@nestjs/common';
import { School, UserRole } from '@prisma/client';
import { AuthUser, authUserInclude } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleProfile } from './auth.types';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id }, include: authUserInclude });
  }

  findSchoolById(id: number): Promise<School | null> {
    return this.prisma.school.findUnique({ where: { id } });
  }

  async findSchoolByEmail(email: string): Promise<School | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    return this.prisma.school.findFirst({ where: { emailDomains: { has: domain } } });
  }

  /** googleId 또는 email 로 찾아 연결, 없으면 생성. 학교 도메인 메일이면 학교 인증 처리 */
  async upsertUser(p: Omit<GoogleProfile, 'googleId'> & { googleId?: string }, opts: { superAdmin: boolean; school: School | null }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [...(p.googleId ? [{ googleId: p.googleId }] : []), { email: p.email }] },
    });
    const verify =
      opts.school && !existing?.schoolVerifiedAt
        ? { schoolId: opts.school.id, schoolEmail: p.email, schoolVerifiedAt: new Date() }
        : {};
    const role = opts.superAdmin ? { role: UserRole.SUPER_ADMIN } : {};
    const base = { email: p.email, name: p.name, picture: p.picture, ...(p.googleId ? { googleId: p.googleId } : {}) };
    if (existing) {
      return this.prisma.user.update({ where: { id: existing.id }, data: { ...base, picture: p.picture ?? existing.picture, ...verify, ...role } });
    }
    return this.prisma.user.create({ data: { ...base, ...verify, ...role } });
  }

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  deleteRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  deleteExpiredTokens(userId: string) {
    return this.prisma.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  }
}
