import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:crewfit/app/modules/user/data/models/update_intro_request_model.dart';
import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'user_api.g.dart';

@injectable
@RestApi(baseUrl: '/users/')
abstract class UserApi {
  @factoryMethod
  factory UserApi(ApiDio dio) = _UserApi;

  @GET('me')
  Future<MeEntity> me();

  @PATCH('me/intro')
  Future<void> updateIntro(@Body() UpdateIntroRequestModel request);
}
