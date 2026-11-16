import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WsException } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { AuthRepository } from '../auth/auth.repository';
import { AuthUser } from '../common/types/auth-user.type';
import { ChatEmitter, teamRoom } from './chat.emitter';
import { ChatService } from './chat.service';

interface TeamPayload {
  teamId: number;
}
interface SendPayload extends TeamPayload {
  content: string;
}

/**
 * socket.io namespace /chat
 * connect: io(`${API}/chat`, { auth: { token: accessToken } })
 * emit 'join' {teamId} → 'message' 수신 / emit 'send' {teamId, content}
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly authRepository: AuthRepository,
    private readonly chatService: ChatService,
    private readonly emitter: ChatEmitter,
  ) {}

  afterInit(server: Namespace) {
    this.emitter.server = server;
  }

  async handleConnection(socket: Socket) {
    try {
      const raw = socket.handshake.auth?.token ?? String(socket.handshake.headers.authorization ?? '');
      const { sub } = this.jwt.verify<{ sub?: string }>(String(raw).replace(/^Bearer\s+/i, ''));
      const user = sub ? await this.authRepository.findUserById(sub) : null;
      if (!user) throw new Error('no user');
      socket.data.user = user;
    } catch {
      socket.emit('error', { message: 'unauthorized' });
      socket.disconnect(true);
    }
  }

  private user(socket: Socket): AuthUser {
    const u = socket.data.user as AuthUser | undefined;
    if (!u) throw new WsException('unauthorized');
    return u;
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      this.logger.warn(e instanceof Error ? e.message : String(e));
      throw new WsException(e instanceof Error ? e.message : 'error');
    }
  }

  @SubscribeMessage('join')
  join(@ConnectedSocket() socket: Socket, @MessageBody() { teamId }: TeamPayload) {
    return this.run(async () => {
      await this.chatService.assertMember(Number(teamId), this.user(socket).id);
      await socket.join(teamRoom(Number(teamId)));
      return { ok: true };
    });
  }

  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() socket: Socket, @MessageBody() { teamId }: TeamPayload) {
    await socket.leave(teamRoom(Number(teamId)));
    return { ok: true };
  }

  @SubscribeMessage('send')
  send(@ConnectedSocket() socket: Socket, @MessageBody() { teamId, content }: SendPayload) {
    return this.run(() => this.chatService.send(this.user(socket), Number(teamId), content));
  }
}
