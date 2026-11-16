import { Injectable } from '@nestjs/common';
import { Namespace } from 'socket.io';

export const teamRoom = (teamId: number) => `team:${teamId}`;

/** 게이트웨이 서버 보관 (서비스 ↔ 게이트웨이 순환 의존 방지) */
@Injectable()
export class ChatEmitter {
  server?: Namespace;

  emit(teamId: number, event: string, payload: unknown) {
    this.server?.to(teamRoom(teamId)).emit(event, payload);
  }
}
