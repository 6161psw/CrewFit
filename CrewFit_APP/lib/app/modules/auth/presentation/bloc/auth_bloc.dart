import 'dart:async';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:crewfit/app/modules/auth/domain/repositories/auth_repository.dart';
import 'package:crewfit/app/modules/common/presentation/utils/error_message.dart';
import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:crewfit/app/modules/user/domain/repositories/user_repository.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';

part 'auth_bloc.freezed.dart';

@singleton
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _auth;
  final UserRepository _users;
  StreamSubscription<bool>? _sub;

  AuthBloc(this._auth, this._users) : super(const AuthState.initial()) {
    on<_Started>(_onStarted);
    on<_Changed>(_onChanged, transformer: restartable());
    on<_GoogleLogin>(_onGoogle, transformer: droppable());
    on<_DevLogin>(_onDev, transformer: droppable());
    on<_Logout>(_onLogout);
    on<_ReloadMe>(_onReloadMe);
  }

  void _onStarted(_Started event, Emitter<AuthState> emit) {
    _sub ??= _auth.signedIn.distinct().listen(
      (signed) => add(AuthEvent.changed(signed)),
    );
  }

  Future<void> _onChanged(_Changed event, Emitter<AuthState> emit) async {
    if (!event.signedIn) return emit(const AuthState.unauthenticated());
    emit(const AuthState.loading());
    try {
      emit(AuthState.authenticated(await _users.me()));
    } catch (e) {
      emit(AuthState.unauthenticated(error: errorMessage(e)));
    }
  }

  Future<void> _onGoogle(_GoogleLogin event, Emitter<AuthState> emit) =>
      _login(emit, _auth.signInWithGoogle);

  Future<void> _onDev(_DevLogin event, Emitter<AuthState> emit) =>
      _login(emit, () => _auth.devLogin(event.email));

  Future<void> _login(
    Emitter<AuthState> emit,
    Future<void> Function() call,
  ) async {
    emit(const AuthState.loading());
    try {
      await call(); // 성공 → 토큰 스트림 → _Changed(true)
    } catch (e) {
      emit(AuthState.unauthenticated(error: e.toString()));
    }
  }

  Future<void> _onLogout(_Logout event, Emitter<AuthState> emit) =>
      _auth.signOut();

  Future<void> _onReloadMe(_ReloadMe event, Emitter<AuthState> emit) async {
    if (state is! Authenticated) return;
    try {
      emit(AuthState.authenticated(await _users.me()));
    } catch (_) {}
  }

  @override
  Future<void> close() async {
    await _sub?.cancel();
    return super.close();
  }
}

@freezed
sealed class AuthEvent with _$AuthEvent {
  const factory AuthEvent.started() = _Started;
  const factory AuthEvent.changed(bool signedIn) = _Changed;
  const factory AuthEvent.googleLogin() = _GoogleLogin;
  const factory AuthEvent.devLogin(String email) = _DevLogin;
  const factory AuthEvent.logout() = _Logout;
  const factory AuthEvent.reloadMe() = _ReloadMe;
}

@freezed
sealed class AuthState with _$AuthState {
  const factory AuthState.initial() = AuthInitial;
  const factory AuthState.loading() = AuthLoading;
  const factory AuthState.authenticated(MeEntity me) = Authenticated;
  const factory AuthState.unauthenticated({String? error}) = Unauthenticated;
}
