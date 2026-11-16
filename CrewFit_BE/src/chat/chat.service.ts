import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MessageType, TeamStatus } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user.type';
import { ChatEmitter } from './chat.emitter';
import { ChatRepository, MessageRow } from './chat.repository';

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
    private readonly chatRepository: ChatRepository,
    private readonly emitter: ChatEmitter,
  ) {}

  async assertMember(teamId: number, userId: string) {
    const m = await this.chatRepository.findMember(teamId, userId);
    if (!m) throw new ForbiddenException('팀원만 볼 수 있어요');
    return m;
  }

  async list(user: AuthUser, teamId: number, before?: number, limit = 50) {
    await this.assertMember(teamId, user.id);
    const rows = await this.chatRepository.findMessages(teamId, before, Math.min(limit, 100));
    return rows.reverse().map(toMessage);
  }

  async send(user: AuthUser, teamId: number, content: string) {
    const text = content?.trim();
    if (!text || text.length > 2000) throw new BadRequestException('메시지는 1~2000자');
    await this.assertMember(teamId, user.id);
    const team = await this.chatRepository.findTeam(teamId);
    if (!team || team.status === TeamStatus.DISBANDED) throw new BadRequestException('해산된 팀');
    const msg = toMessage(await this.chatRepository.createMessage({ teamId, senderId: user.id, content: text }));
    this.emitter.emit(teamId, 'message', msg);
    return msg;
  }

  /** 시스템 메시지 ("OO님이 '앱 개발'로 들어왔어요") */
  async system(teamId: number, content: string) {
    const msg = toMessage(await this.chatRepository.createMessage({ teamId, type: MessageType.SYSTEM, content }));
    this.emitter.emit(teamId, 'message', msg);
    return msg;
  }

  /** 팀 상태 변경 알림 (확정/제출/보완 요청 등) */
  notifyTeam(teamId: number, payload: Record<string, unknown>) {
    this.emitter.emit(teamId, 'team', { teamId, ...payload });
  }
}
