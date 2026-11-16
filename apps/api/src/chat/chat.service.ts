import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MessageType, Prisma, TeamStatus } from '@prisma/client';
import { Namespace } from 'socket.io';
import { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export const teamRoom = (teamId: number) => `team:${teamId}`;

/** 게이트웨이 서버 보관 (순환 의존 방지) */
@Injectable()
export class ChatEmitter {
  server?: Namespace;

  emit(teamId: number, event: string, payload: unknown) {
    this.server?.to(teamRoom(teamId)).emit(event, payload);
  }
}

const messageInclude = { sender: { select: { id: true, name: true, picture: true } } } satisfies Prisma.ChatMessageInclude;
type MessageRow = Prisma.ChatMessageGetPayload<{ include: typeof messageInclude }>;

export const toMessage = (m: MessageRow) => ({
  id: m.id,
  teamId: m.teamId,
  type: m.type,
  content: m.content,
  createdAt: m.createdAt,
  sender: m.sender,
});

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: ChatEmitter,
  ) {}

  async assertMember(teamId: number, userId: string) {
    const m = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (!m) throw new ForbiddenException('팀원만 볼 수 있어요');
    return m;
  }

  async list(user: AuthUser, teamId: number, before?: number, limit = 50) {
    await this.assertMember(teamId, user.id);
    const rows = await this.prisma.chatMessage.findMany({
      where: { teamId, ...(before ? { id: { lt: before } } : {}) },
      orderBy: { id: 'desc' },
      take: Math.min(limit, 100),
      include: messageInclude,
    });
    return rows.reverse().map(toMessage);
  }

  async send(user: AuthUser, teamId: number, content: string) {
    const text = content?.trim();
    if (!text || text.length > 2000) throw new BadRequestException('메시지는 1~2000자');
    await this.assertMember(teamId, user.id);
    const team = await this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    if (team.status === TeamStatus.DISBANDED) throw new BadRequestException('해산된 팀');
    const m = await this.prisma.chatMessage.create({ data: { teamId, senderId: user.id, content: text }, include: messageInclude });
    const msg = toMessage(m);
    this.emitter.emit(teamId, 'message', msg);
    return msg;
  }

  /** 시스템 메시지 ("OO님이 '앱 개발'로 들어왔어요") */
  async system(teamId: number, content: string) {
    const m = await this.prisma.chatMessage.create({ data: { teamId, type: MessageType.SYSTEM, content }, include: messageInclude });
    const msg = toMessage(m);
    this.emitter.emit(teamId, 'message', msg);
    return msg;
  }

  /** 팀 상태 변경 알림 (확정/제출 등) */
  notifyTeam(teamId: number, payload: Record<string, unknown>) {
    this.emitter.emit(teamId, 'team', { teamId, ...payload });
  }
}
