import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/team/presentation/bloc/team_cubits.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// 팀 미리보기 + 지원
@RoutePage()
class TeamPreviewPage extends StatelessWidget {
  const TeamPreviewPage({super.key, required this.teamId});
  final int teamId;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<TeamDetailCubit>()..open(teamId),
    child: const _View(),
  );
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<TeamDetailCubit>();
    final t = cubit.data;
    return Scaffold(
      appBar: AppBar(
        title: const Text('팀 정보'),
        actions: [
          if (t != null)
            IconButton(
              icon: Icon(
                t.isLiked ? Icons.favorite : Icons.favorite_border,
                color: t.isLiked ? Palette.danger : null,
              ),
              onPressed: () async {
                final err = await cubit.toggleLike();
                if (err != null && context.mounted) context.toast(err);
              },
            ),
        ],
      ),
      body: LoadView(
        state: cubit.state,
        onRetry: cubit.load,
        builder: (t) => ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Container(
              color: Palette.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Chip2(t.status.label),
                      const SizedBox(width: 6),
                      Chip2('${t.memberCount}/${t.capacity}명', color: Palette.textSub),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(t.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(t.contest.title, style: const TextStyle(color: Palette.textSub)),
                  if (t.description.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(t.description),
                  ],
                ],
              ),
            ),
            const SectionTitle('역할'),
            for (final r in t.roles)
              ListTile(
                dense: true,
                title: Text(r.name),
                trailing: Chip2(
                  (r.open ?? 0) > 0 ? '${r.open}자리 남음' : '마감',
                  color: (r.open ?? 0) > 0 ? Palette.accent : Palette.textMuted,
                ),
              ),
            const SectionTitle('멤버'),
            for (final m in t.members)
              ListTile(
                leading: Avatar(name: m.name, picture: m.picture),
                title: Text('${m.name}${m.isLeader ? ' (팀장)' : ''}'),
                subtitle: Text(
                  [m.role?.name, m.school?.shortName, m.major]
                      .whereType<String>()
                      .join(' · '),
                ),
                trailing: m.schoolVerified
                    ? const Icon(Icons.verified, color: Palette.primary, size: 18)
                    : null,
                onTap: () => context.router.push(ProfileRoute(userId: m.id)),
              ),
          ],
        ),
      ),
      bottomNavigationBar: t == null ? null : _Bottom(t),
    );
  }
}

class _Bottom extends StatelessWidget {
  const _Bottom(this.t);
  final TeamDetail t;

  @override
  Widget build(BuildContext context) {
    final Widget button;
    if (t.me.isMember) {
      button = FilledButton(
        onPressed: () => context.router.push(
          ChatRoomRoute(teamId: t.id, teamName: t.name),
        ),
        child: const Text('채팅방 가기'),
      );
    } else if (t.me.pendingInvitation != null) {
      button = FilledButton(
        onPressed: null,
        child: Text(
          t.me.pendingInvitation!.type == InvitationType.offer
              ? '받은 제안 있음 (지원·제안함에서 확인)'
              : '지원 대기중',
        ),
      );
    } else {
      final open = t.roles.where((r) => (r.open ?? 0) > 0).toList();
      button = FilledButton(
        onPressed: t.status != TeamStatus.recruiting || open.isEmpty
            ? null
            : () => _apply(context, open),
        child: const Text('지원하기'),
      );
    }
    return SafeArea(
      child: Padding(padding: const EdgeInsets.all(16), child: button),
    );
  }

  Future<void> _apply(BuildContext context, List<RoleRef> roles) async {
    final cubit = context.read<TeamDetailCubit>();
    final result = await showModalBottomSheet<(int, String)>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ApplySheet(roles),
    );
    if (result == null) return;
    final err = await cubit.apply(result.$1, result.$2.isEmpty ? null : result.$2);
    if (context.mounted) context.toast(err ?? '지원 완료');
  }
}

class _ApplySheet extends StatefulWidget {
  const _ApplySheet(this.roles);
  final List<RoleRef> roles;

  @override
  State<_ApplySheet> createState() => _ApplySheetState();
}

class _ApplySheetState extends State<_ApplySheet> {
  late int _roleId = widget.roles.first.id;
  final _msg = TextEditingController();

  @override
  void dispose() {
    _msg.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      16,
      16,
      16,
      16 + MediaQuery.of(context).viewInsets.bottom,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          '어떤 역할로 참여할까요?',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final r in widget.roles)
              ChoiceChip(
                label: Text(r.name),
                selected: _roleId == r.id,
                onSelected: (_) => setState(() => _roleId = r.id),
              ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _msg,
          maxLength: 300,
          decoration: const InputDecoration(hintText: '한 줄 소개 (선택)'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, (_roleId, _msg.text.trim())),
          child: const Text('지원 보내기'),
        ),
      ],
    ),
  );
}
