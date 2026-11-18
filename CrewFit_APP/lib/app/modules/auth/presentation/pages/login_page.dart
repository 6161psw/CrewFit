import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/values/env.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

@RoutePage()
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController(text: 'student1@gm.gist.ac.kr');

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AuthBloc>().state;
    final loading = state is AuthLoading;
    final error = switch (state) {
      Unauthenticated(:final error) => error,
      _ => null,
    };
    final bloc = context.read<AuthBloc>();

    return Scaffold(
      backgroundColor: Palette.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              const Text(
                'CrewFit',
                style: TextStyle(
                  color: Palette.primary,
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '공모전 팀원 찾기부터 서류 제출까지',
                style: TextStyle(color: Palette.textSub, fontSize: 16),
              ),
              const Spacer(),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(error, style: const TextStyle(color: Palette.danger)),
                ),
              if (Env.googleEnabled)
                FilledButton.icon(
                  onPressed: loading
                      ? null
                      : () => bloc.add(const AuthEvent.googleLogin()),
                  icon: const Icon(Icons.login),
                  label: const Text('Google 계정으로 시작하기'),
                ),
              if (Env.devLogin) ...[
                const SizedBox(height: 24),
                const Text('개발용 로그인', style: TextStyle(color: Palette.textMuted)),
                const SizedBox(height: 8),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(hintText: '이메일'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: loading
                      ? null
                      : () => bloc.add(AuthEvent.devLogin(_email.text.trim())),
                  child: const Text('이메일로 로그인 (dev)'),
                ),
              ],
              if (!Env.googleEnabled && !Env.devLogin)
                const Text(
                  'env.json 설정 필요 (README)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Palette.danger),
                ),
              if (loading)
                const Padding(
                  padding: EdgeInsets.only(top: 16),
                  child: Center(child: CircularProgressIndicator()),
                ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
