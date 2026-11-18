import 'package:dio/dio.dart';

/// Nest 에러 응답 {message: string | string[]} → 한 줄
String errorMessage(Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final m = data['message'];
      return m is List ? m.join('\n') : m.toString();
    }
    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.connectionError =>
        '서버 연결 실패 (API_URL·Wi-Fi 확인)',
      _ => '요청 실패 (${e.response?.statusCode ?? '-'})',
    };
  }
  return e.toString();
}
