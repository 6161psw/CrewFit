import 'package:crewfit/app/modules/auth/data/data_sources/remote/authorize_interceptor.dart';
import 'package:crewfit/app/values/env.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:injectable/injectable.dart';

/// 인증 붙는 API Dio (retrofit 공용)
@singleton
class ApiDio extends DioForNative {
  ApiDio(AuthorizeInterceptor interceptor)
    : super(
        BaseOptions(
          baseUrl: Env.apiUrl,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 20),
        ),
      ) {
    interceptors.add(interceptor);
  }
}

/// 토큰 재발급 전용 (인터셉터 없음 → 무한 루프 방지)
@singleton
class PlainDio extends DioForNative {
  PlainDio()
    : super(
        BaseOptions(
          baseUrl: Env.apiUrl,
          connectTimeout: const Duration(seconds: 8),
        ),
      );
}
