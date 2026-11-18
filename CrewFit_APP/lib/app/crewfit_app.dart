import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/router.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/theme.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

final _router = sl<AppRouter>();

/// 로그인 상태 → 화면 교체 (스플래시/로그인 ↔ 메인)
void routeByAuth(AuthState state) {
  final top = _router.current.name;
  switch (state) {
    case Authenticated() when top == SplashRoute.name || top == LoginRoute.name:
      _router.replaceAll([const MainRoute()]);
    case Unauthenticated() when top != LoginRoute.name:
      _router.replaceAll([const LoginRoute()]);
    default:
      break;
  }
}

class CrewFitApp extends StatelessWidget {
  const CrewFitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<AuthBloc>()..add(const AuthEvent.started()),
      child: GestureDetector(
        onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
        child: MaterialApp.router(
          title: 'CrewFit',
          debugShowCheckedModeBanner: false,
          theme: CrewTheme.theme,
          routerConfig: _router.config(),
          builder: (_, child) => BlocListener<AuthBloc, AuthState>(
            listener: (_, state) => routeByAuth(state),
            child: child ?? const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}
