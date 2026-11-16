import { Injectable } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const messageInclude = { sender: { select: { id: true, name: true, picture: true } } } satisfies Prisma.ChatMessageInclude;
export type MessageRow = Prisma.ChatMessageGetPayload<{ include: typeof messageInclude }>;

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMember(teamId: number, userId: string) {
    return this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  }

  findTeam(teamId: number) {
    return this.prisma.team.findUnique({ where: { id: teamId } });
  }

  findMessages(teamId: number, before: number | undefined, take: number): Promise<MessageRow[]> {
    return this.prisma.chatMessage.findMany({
      where: { teamId, ...(before ? { id: { lt: before } } : {}) },
      orderBy: { id: 'desc' },
      take,
      include: messageInclude,
    });
  }

  createMessage(data: { teamId: number; senderId?: string; type?: MessageType; content: string }): Promise<MessageRow> {
    return this.prisma.chatMessage.create({ data, include: messageInclude });
  }
}
