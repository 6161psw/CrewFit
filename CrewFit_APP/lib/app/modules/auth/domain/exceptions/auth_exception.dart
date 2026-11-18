sealed class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}

class CancelledByUserException extends AuthException {
  const CancelledByUserException() : super('로그인 취소');
}

class GoogleDisabledException extends AuthException {
  const GoogleDisabledException()
    : super('GOOGLE_SERVER_CLIENT_ID 미설정 (env.json)');
}

class LoginFailedException extends AuthException {
  const LoginFailedException(super.message);
}
