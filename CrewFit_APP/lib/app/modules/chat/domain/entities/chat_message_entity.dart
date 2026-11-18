import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_message_entity.freezed.dart';
part 'chat_message_entity.g.dart';

@freezed
abstract class ChatMessageEntity with _$ChatMessageEntity {
  const factory ChatMessageEntity({
    required int id,
    required int teamId,
    required MessageType type,
    required String content,
    required DateTime createdAt,
    UserRef? sender,
  }) = _ChatMessageEntity;

  factory ChatMessageEntity.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageEntityFromJson(json);
}
