import 'dart:async';

import 'package:crewfit/app/modules/auth/domain/repositories/token_repository.dart';
import 'package:crewfit/app/modules/chat/data/data_sources/remote/chat_api.dart';
import 'package:crewfit/app/modules/chat/data/models/send_message_request_model.dart';
import 'package:crewfit/app/modules/chat/domain/entities/chat_message_entity.dart';
import 'package:crewfit/app/modules/chat/domain/repositories/chat_repository.dart';
import 'package:crewfit/app/values/env.dart';
import 'package:injectable/injectable.dart';
import 'package:logging/logging.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

final _log = Logger('chat');

/// 기록·전송 = REST, 수신 = socket.io `/chat` (BE ChatGateway)
@LazySingleton(as: ChatRepository)
class SocketIoChatRepository implements ChatRepository {
  final ChatApi _api;
  final TokenRepository _tokens;
  SocketIoChatRepository(this._api, this._tokens);

  @override
  Future<List<ChatMessageEntity>> history(int teamId, {int? before}) =>
      _api.list(teamId, before: before, limit: 100);

  @override
  Future<ChatMessageEntity> send(int teamId, String content) =>
      _api.send(teamId, SendMessageRequestModel(content: content));

  @override
  Stream<ChatMessageEntity> live(int teamId) {
    late io.Socket socket;
    late StreamController<ChatMessageEntity> ctrl;
    ctrl = StreamController<ChatMessageEntity>(
      onListen: () {
        socket = io.io(
          '${Env.apiUrl}/chat',
          io.OptionBuilder()
              .setTransports(['websocket'])
              .disableAutoConnect()
              .enableForceNew()
              .setAuth({'token': _tokens.currentAccessToken})
              .build(),
        );
        socket
          ..onConnect((_) => socket.emit('join', {'teamId': teamId}))
          ..onConnectError((e) => _log.warning('connect error', e))
          ..on('error', (e) => _log.warning('socket error', e))
          ..on('message', (data) {
            if (data is! Map) return;
            final msg = ChatMessageEntity.fromJson(
              Map<String, dynamic>.from(data),
            );
            if (msg.teamId == teamId && !ctrl.isClosed) ctrl.add(msg);
          })
          ..connect();
      },
      onCancel: () {
        socket
          ..emit('leave', {'teamId': teamId})
          ..dispose();
      },
    );
    return ctrl.stream;
  }
}
