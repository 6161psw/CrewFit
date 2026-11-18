import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:crewfit/app/modules/invitation/domain/entities/invitation_entity.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'invitation_api.g.dart';

@injectable
@RestApi(baseUrl: '/invitations')
abstract class InvitationApi {
  @factoryMethod
  factory InvitationApi(ApiDio dio) = _InvitationApi;

  /// box: received | sent
  @GET('')
  Future<List<InvitationEntity>> list(
    @Query('box') String box, {
    @Query('status') String? status,
  });

  @POST('/{id}/accept')
  Future<void> accept(@Path() int id);

  @POST('/{id}/reject')
  Future<void> reject(@Path() int id);

  @POST('/{id}/cancel')
  Future<void> cancel(@Path() int id);
}
