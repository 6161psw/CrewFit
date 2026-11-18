import 'package:crewfit/app/modules/chat/data/models/send_message_request_model.dart';
import 'package:crewfit/app/modules/chat/domain/entities/chat_message_entity.dart';
import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'chat_api.g.dart';

@injectable
@RestApi(baseUrl: '/teams')
abstract class ChatApi {
  @factoryMethod
  factory ChatApi(ApiDio dio) = _ChatApi;

  @GET('/{teamId}/messages')
  Future<List<ChatMessageEntity>> list(
    @Path() int teamId, {
    @Query('before') int? before,
    @Query('limit') int? limit,
  });

  @POST('/{teamId}/messages')
  Future<ChatMessageEntity> send(
    @Path() int teamId,
    @Body() SendMessageRequestModel request,
  );
}
