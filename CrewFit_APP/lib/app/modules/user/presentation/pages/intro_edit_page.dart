import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:crewfit/app/modules/user/presentation/bloc/intro_cubit.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// E-04 자소서
@RoutePage()
class IntroEditPage extends StatelessWidget {
  const IntroEditPage({super.key, required this.intro});
  final IntroEntity intro;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<IntroCubit>(),
    child: _Form(intro),
  );
}

class _Form extends StatefulWidget {
  const _Form(this.intro);
  final IntroEntity intro;

  @override
  State<_Form> createState() => _FormState();
}

class _FormState extends State<_Form> {
  late final _oneLiner = TextEditingController(text: widget.intro.oneLiner);
  late final _role = TextEditingController(text: widget.intro.role);
  late final _exp = TextEditingController(text: widget.intro.experience);

  @override
  void dispose() {
    _oneLiner.dispose();
    _role.dispose();
    _exp.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final err = await context.read<IntroCubit>().save(
      oneLiner: _oneLiner.text.trim(),
      role: _role.text.trim(),
      experience: _exp.text.trim(),
    );
    if (!mounted) return;
    if (err != null) return context.toast(err);
    context.read<AuthBloc>().add(const AuthEvent.reloadMe());
    context.router.maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final busy = context.watch<IntroCubit>().state;
    return Scaffold(
      appBar: AppBar(title: const Text('자기소개 수정')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _oneLiner,
            maxLength: 100,
            decoration: const InputDecoration(labelText: 'Q1. 나를 한 줄로 소개해요'),
          ),
          TextField(
            controller: _role,
            maxLength: 1000,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Q2. 팀에서 맡고 싶은 역할'),
          ),
          TextField(
            controller: _exp,
            maxLength: 2000,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Q3. 끝까지 해낸 경험'),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: busy ? null : _save,
            child: Text(busy ? '저장 중…' : '저장'),
          ),
        ),
      ),
    );
  }
}
