import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { ChatService } from './chat.service';
import { MessagesQuery } from './dto/req/messages-query.dto';
import { SendMessageDto } from './dto/req/send-message.dto';

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
