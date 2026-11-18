import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:crewfit/app/modules/submission/domain/entities/submission_entity.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:retrofit/retrofit.dart';

part 'submission_api.g.dart';

/// 파일 업로드는 웹(CrewFit_FE)에서. 앱 = 확인·서명·제출
@injectable
@RestApi(baseUrl: '/teams')
abstract class SubmissionApi {
  @factoryMethod
  factory SubmissionApi(ApiDio dio) = _SubmissionApi;

  @GET('/{teamId}/submission')
  Future<SubmissionEntity> get(@Path() int teamId);

  @POST('/{teamId}/submission/signature')
  Future<void> sign(@Path() int teamId);

  @POST('/{teamId}/submission/submit')
  Future<void> submit(@Path() int teamId);
}
