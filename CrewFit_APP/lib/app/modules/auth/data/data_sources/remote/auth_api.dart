import 'package:crewfit/app/modules/auth/data/models/auth_models.dart';
import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'auth_api.g.dart';

/// 로그인 계열: 토큰 없이 호출 → PlainDio
@injectable
@RestApi(baseUrl: '/auth/')
abstract class AuthApi {
  @factoryMethod
  factory AuthApi(PlainDio dio) = _AuthApi;

  /// 앱: 구글 idToken → 토큰 (body)
  @POST('google/token')
  Future<TokensModel> googleToken(@Body() IdTokenRequestModel request);

  @POST('refresh')
  Future<TokensModel> refresh(@Body() RefreshRequestModel request);

  @POST('logout')
  Future<void> logout(@Body() RefreshRequestModel request);

  @POST('dev-login')
  Future<TokensModel> devLogin(@Body() DevLoginRequestModel request);
}
