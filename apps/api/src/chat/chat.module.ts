import { Body, Controller, Get, Module, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthModule } from '../auth/auth.module';
import { JwtGuard } from '../auth/guards';
import { AuthUser, GetUser } from '../common/auth-user';
import { ChatGateway } from './chat.gateway';
import { ChatEmitter, ChatService } from './chat.service';

class MessagesQuery {
  /** 이 id 이전 메시지 (무한 스크롤) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit = 50;
}

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('teams/:teamId/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** T-03 채팅 내역 */
  @Get()
  list(@GetUser() user: AuthUser, @Param('teamId', ParseIntPipe) teamId: number, @Query() q: MessagesQuery) {
    return this.chatService.list(user, teamId, q.before, q.limit);
  }

  /** 소켓 대신 REST 전송 (동일하게 브로드캐스트) */
  @Post()
  send(@GetUser() user: AuthUser, @Param('teamId', ParseIntPipe) teamId: number, @Body() dto: SendMessageDto) {
    return this.chatService.send(user, teamId, dto.content);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatEmitter, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
