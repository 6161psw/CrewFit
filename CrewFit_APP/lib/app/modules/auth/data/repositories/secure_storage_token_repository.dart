import 'dart:async';

import 'package:crewfit/app/modules/auth/domain/repositories/token_repository.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';
import 'package:rxdart/subjects.dart';

@LazySingleton(as: TokenRepository, dispose: SecureStorageTokenRepository.dispose)
class SecureStorageTokenRepository implements TokenRepository {
  static const _accessKey = 'accessToken';
  static const _refreshKey = 'refreshToken';

  final FlutterSecureStorage _storage;
  final _access = BehaviorSubject<String?>();
  String? _refresh;

  SecureStorageTokenRepository(this._storage);

  @PostConstruct(preResolve: true)
  Future<void> init() async {
    _access.add(await _storage.read(key: _accessKey));
    _refresh = await _storage.read(key: _refreshKey);
  }

  static FutureOr dispose(TokenRepository repo) =>
      (repo as SecureStorageTokenRepository)._access.close();

  @override
  Stream<String?> get accessToken => _access.stream;

  @override
  String? get currentAccessToken => _access.valueOrNull;

  @override
  String? get currentRefreshToken => _refresh;

  @override
  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    _refresh = refreshToken;
    _access.add(accessToken);
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  @override
  Future<void> clear() async {
    _refresh = null;
    _access.add(null);
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
