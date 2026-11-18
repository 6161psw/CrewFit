import 'package:crewfit/app/modules/chat/domain/entities/chat_message_entity.dart';

abstract class ChatRepository {
  Future<List<ChatMessageEntity>> history(int teamId, {int? before});
  Future<ChatMessageEntity> send(int teamId, String content);

  /// 실시간 수신 (구독 해제 시 소켓 종료)
  Stream<ChatMessageEntity> live(int teamId);
}
