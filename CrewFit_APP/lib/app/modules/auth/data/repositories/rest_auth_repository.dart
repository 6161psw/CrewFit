import 'package:crewfit/app/modules/auth/data/data_sources/remote/auth_api.dart';
import 'package:crewfit/app/modules/auth/data/models/auth_models.dart';
import 'package:crewfit/app/modules/auth/domain/exceptions/auth_exception.dart';
import 'package:crewfit/app/modules/auth/domain/repositories/auth_repository.dart';
import 'package:crewfit/app/modules/auth/domain/repositories/token_repository.dart';
import 'package:crewfit/app/modules/common/presentation/utils/error_message.dart';
import 'package:crewfit/app/values/env.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:injectable/injectable.dart';

/// 구글 네이티브 로그인 → idToken → POST /auth/google/token
@LazySingleton(as: AuthRepository)
class RestAuthRepository implements AuthRepository {
  final AuthApi _api;
  final TokenRepository _tokens;
  bool _googleReady = false;

  RestAuthRepository(this._api, this._tokens);

  @override
  Stream<bool> get signedIn => _tokens.accessToken.map((t) => t != null);

  @override
  bool get isSignedIn => _tokens.currentAccessToken != null;

  Future<GoogleSignIn> _google() async {
    if (!Env.googleEnabled) throw const GoogleDisabledException();
    if (!_googleReady) {
      // serverClientId = 웹 클라이언트 ID → idToken aud 가 백엔드 GOOGLE_CLIENT_ID 와 일치
      await GoogleSignIn.instance.initialize(
        serverClientId: Env.googleServerClientId,
      );
      _googleReady = true;
    }
    return GoogleSignIn.instance;
  }

  @override
  Future<void> signInWithGoogle() async {
    final google = await _google();
    final GoogleSignInAccount account;
    try {
      account = await google.authenticate();
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw const CancelledByUserException();
      }
      throw LoginFailedException('구글 로그인 실패: ${e.description ?? e.code}');
    }
    final idToken = account.authentication.idToken;
    if (idToken == null) throw const LoginFailedException('idToken 없음');
    await _save(() => _api.googleToken(IdTokenRequestModel(idToken: idToken)));
  }

  @override
  Future<void> devLogin(String email, {String? name}) => _save(
    () => _api.devLogin(DevLoginRequestModel(email: email, name: name)),
  );

  Future<void> _save(Future<TokensModel> Function() call) async {
    try {
      final t = await call();
      await _tokens.save(
        accessToken: t.accessToken,
        refreshToken: t.refreshToken,
      );
    } on AuthException {
      rethrow;
    } catch (e) {
      throw LoginFailedException(errorMessage(e));
    }
  }

  @override
  Future<void> signOut() async {
    final refresh = _tokens.currentRefreshToken;
    await _tokens.clear();
    if (refresh != null) {
      try {
        await _api.logout(RefreshRequestModel(refreshToken: refresh));
      } catch (_) {}
    }
    if (_googleReady) await GoogleSignIn.instance.signOut();
  }
}
