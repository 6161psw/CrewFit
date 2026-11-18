abstract class AuthRepository {
  /// null = 로그아웃 상태
  Stream<bool> get signedIn;
  bool get isSignedIn;
  Future<void> signInWithGoogle();
  Future<void> devLogin(String email, {String? name});
  Future<void> signOut();
}
