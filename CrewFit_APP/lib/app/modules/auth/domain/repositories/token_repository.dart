abstract class TokenRepository {
  Stream<String?> get accessToken;
  String? get currentAccessToken;
  String? get currentRefreshToken;
  Future<void> save({required String accessToken, required String refreshToken});
  Future<void> clear();
}
