import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/team/presentation/bloc/create_team_cubit.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// E-01 팀 만들기
@RoutePage()
class CreateTeamPage extends StatelessWidget {
  const CreateTeamPage({
    super.key,
    required this.contestId,
    required this.contestTitle,
  });
  final int contestId;
  final String contestTitle;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<CreateTeamCubit>(),
    child: _Form(contestId: contestId, contestTitle: contestTitle),
  );
}

class _RoleRow {
  final name = TextEditingController();
  int capacity = 1;
}

class _Form extends StatefulWidget {
  const _Form({required this.contestId, required this.contestTitle});
  final int contestId;
  final String contestTitle;

  @override
  State<_Form> createState() => _FormState();
}

class _FormState extends State<_Form> {
  final _name = TextEditingController();
  final _desc = TextEditingController();
  final _myRole = TextEditingController();
  final _roles = [_RoleRow()];

  @override
  void dispose() {
    for (final c in [_name, _desc, _myRole, ..._roles.map((r) => r.name)]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final roles = [
      for (final r in _roles)
        if (r.name.text.trim().isNotEmpty) (r.name.text.trim(), r.capacity),
    ];
    if (_name.text.trim().isEmpty || _myRole.text.trim().isEmpty || roles.isEmpty) {
      return context.toast('팀 이름·내 역할·구하는 역할 1개 이상 입력');
    }
    final (team, err) = await context.read<CreateTeamCubit>().create(
      contestId: widget.contestId,
      name: _name.text.trim(),
      description: _desc.text.trim().isEmpty ? null : _desc.text.trim(),
      myRole: _myRole.text.trim(),
      roles: roles,
    );
    if (!mounted) return;
    if (err != null) return context.toast(err);
    context.router.replace(ChatRoomRoute(teamId: team!.id, teamName: team.name));
  }

  @override
  Widget build(BuildContext context) {
    final busy = context.watch<CreateTeamCubit>().state;
    return Scaffold(
      appBar: AppBar(title: const Text('팀 만들기')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.contestTitle, style: const TextStyle(color: Palette.textSub)),
          const SizedBox(height: 16),
          TextField(
            controller: _name,
            maxLength: 40,
            decoration: const InputDecoration(labelText: '팀(모집 채팅방) 이름'),
          ),
          TextField(
            controller: _desc,
            maxLength: 500,
            maxLines: 3,
            decoration: const InputDecoration(labelText: '소개 (선택)'),
          ),
          TextField(
            controller: _myRole,
            maxLength: 20,
            decoration: const InputDecoration(labelText: '내 역할 (예: 기획)'),
          ),
          const SectionTitle('구하는 역할'),
          for (final r in _roles)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: r.name,
                      decoration: const InputDecoration(hintText: '역할 (예: 개발)'),
                    ),
                  ),
                  IconButton(
                    onPressed: r.capacity > 1
                        ? () => setState(() => r.capacity--)
                        : null,
                    icon: const Icon(Icons.remove),
                  ),
                  Text('${r.capacity}명'),
                  IconButton(
                    onPressed: r.capacity < 10
                        ? () => setState(() => r.capacity++)
                        : null,
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
            ),
          TextButton.icon(
            onPressed: _roles.length < 10
                ? () => setState(() => _roles.add(_RoleRow()))
                : null,
            icon: const Icon(Icons.add),
            label: const Text('역할 추가'),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: busy ? null : _submit,
            child: Text(busy ? '만드는 중…' : '팀 만들기'),
          ),
        ),
      ),
    );
  }
}
