import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:crewfit/app/modules/team/data/models/team_request_models.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'team_api.g.dart';

@injectable
@RestApi(baseUrl: '/teams')
abstract class TeamApi {
  @factoryMethod
  factory TeamApi(ApiDio dio) = _TeamApi;

  @GET('')
  Future<TeamPage> list({
    @Query('contestId') int? contestId,
    @Query('scope') String? scope,
    @Query('sort') String? sort,
    @Query('limit') int? limit,
  });

  @GET('/me')
  Future<MyTeams> mine();

  @POST('')
  Future<TeamDetail> create(@Body() CreateTeamRequestModel request);

  @GET('/{id}')
  Future<TeamDetail> detail(@Path() int id);

  @POST('/{id}/like')
  Future<void> like(@Path() int id);

  @DELETE('/{id}/like')
  Future<void> unlike(@Path() int id);

  @POST('/{id}/leave')
  Future<void> leave(@Path() int id);

  @POST('/{id}/applications')
  Future<void> apply(@Path() int id, @Body() ApplyRequestModel request);

  /// 팀장: 팀 확정 → 제출 준비 시작
  @POST('/{id}/confirm')
  Future<void> confirm(@Path() int id);
}
