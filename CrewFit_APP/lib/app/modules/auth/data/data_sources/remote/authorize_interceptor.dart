import 'dart:async';

import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/auth/data/data_sources/remote/auth_api.dart';
import 'package:crewfit/app/modules/auth/data/models/auth_models.dart';
import 'package:crewfit/app/modules/auth/domain/repositories/token_repository.dart';
import 'package:crewfit/app/modules/core/data/dio/api_dio.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// Bearer 부착 + 401 → refresh(동시 요청 1회로 합침) → 재시도.
/// refresh 실패 시 토큰 삭제 → AuthBloc 로그아웃.
@singleton
class AuthorizeInterceptor extends Interceptor {
  static const _retriedKey = '_authRetried';

  final TokenRepository _tokens;
  Future<bool>? _refreshing;

  AuthorizeInterceptor(this._tokens);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _tokens.currentAccessToken;
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    if (err.response?.statusCode != 401 ||
        options.extra[_retriedKey] == true ||
        _tokens.currentRefreshToken == null) {
      return handler.next(err);
    }
    final used = options.headers['Authorization'];
    final ok = used == 'Bearer ${_tokens.currentAccessToken}'
        ? await (_refreshing ??= _refresh().whenComplete(
            () => _refreshing = null,
          ))
        : true; // 이미 다른 요청이 갱신함
    if (!ok) return handler.next(err);
    options.extra[_retriedKey] = true;
    try {
      handler.resolve(await sl<ApiDio>().fetch(options));
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  Future<bool> _refresh() async {
    final refresh = _tokens.currentRefreshToken;
    if (refresh == null) return false;
    try {
      final t = await sl<AuthApi>().refresh(
        RefreshRequestModel(refreshToken: refresh),
      );
      await _tokens.save(
        accessToken: t.accessToken,
        refreshToken: t.refreshToken,
      );
      return true;
    } catch (_) {
      await _tokens.clear();
      return false;
    }
  }
}
