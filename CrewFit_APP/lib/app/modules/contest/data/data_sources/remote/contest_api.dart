import 'package:crewfit/app/modules/contest/domain/entities/contest_entity.dart';
import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'contest_api.g.dart';

@injectable
@RestApi(baseUrl: '/contests')
abstract class ContestApi {
  @factoryMethod
  factory ContestApi(ApiDio dio) = _ContestApi;

  @GET('')
  Future<ContestPage> list({
    @Query('scope') String? scope,
    @Query('sort') String? sort,
    @Query('q') String? q,
    @Query('limit') int? limit,
  });

  @GET('/{id}')
  Future<ContestDetail> detail(@Path() int id);

  /// filter: all | school | region
  @GET('/{id}/interested-users')
  Future<InterestedUsers> interestedUsers(
    @Path() int id, {
    @Query('filter') String? filter,
    @Query('skill') String? skill,
    @Query('limit') int? limit,
  });

  @POST('/{id}/interest')
  Future<void> addInterest(@Path() int id);

  @DELETE('/{id}/interest')
  Future<void> removeInterest(@Path() int id);
}
