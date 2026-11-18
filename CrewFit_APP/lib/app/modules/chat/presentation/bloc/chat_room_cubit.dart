import 'dart:async';

import 'package:crewfit/app/modules/chat/domain/entities/chat_message_entity.dart';
import 'package:crewfit/app/modules/chat/domain/repositories/chat_repository.dart';
import 'package:crewfit/app/modules/common/presentation/utils/error_message.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';

part 'chat_room_cubit.freezed.dart';

@freezed
abstract class ChatRoomState with _$ChatRoomState {
  const factory ChatRoomState({
    @Default([]) List<ChatMessageEntity> messages,
    @Default(true) bool loading,
    @Default(false) bool sending,
    String? error,
  }) = _ChatRoomState;
}

@injectable
class ChatRoomCubit extends Cubit<ChatRoomState> {
  final ChatRepository _repo;
  StreamSubscription<ChatMessageEntity>? _sub;
  late final int teamId;

  ChatRoomCubit(this._repo) : super(const ChatRoomState());

  Future<void> open(int id) async {
    teamId = id;
    _sub = _repo.live(id).listen(_add);
    try {
      final list = await _repo.history(id);
      if (isClosed) return;
      emit(state.copyWith(loading: false, messages: _merge(list, state.messages)));
    } catch (e) {
      if (!isClosed) emit(state.copyWith(loading: false, error: errorMessage(e)));
    }
  }

  void _add(ChatMessageEntity m) {
    if (isClosed) return;
    emit(state.copyWith(messages: _merge(state.messages, [m])));
  }

  /// id 중복 제거 + 시간순
  List<ChatMessageEntity> _merge(
    List<ChatMessageEntity> a,
    List<ChatMessageEntity> b,
  ) {
    final map = {for (final m in [...a, ...b]) m.id: m};
    return map.values.toList()..sort((x, y) => x.id.compareTo(y.id));
  }

  Future<String?> send(String text) async {
    final content = text.trim();
    if (content.isEmpty || state.sending) return null;
    emit(state.copyWith(sending: true));
    try {
      _add(await _repo.send(teamId, content));
      return null;
    } catch (e) {
      return errorMessage(e);
    } finally {
      if (!isClosed) emit(state.copyWith(sending: false));
    }
  }

  @override
  Future<void> close() async {
    await _sub?.cancel();
    return super.close();
  }
}
