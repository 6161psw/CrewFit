import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/user/domain/entities/profile_entity.dart';
import 'package:crewfit/app/modules/user/presentation/bloc/profile_cubit.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// H-05 프로필 상세 · H-06 팀 제안 · H-07 제안 보냄
@RoutePage()
class ProfilePage extends StatelessWidget {
  const ProfilePage({
    super.key,
    required this.userId,
    this.contestId,
    this.teamId,
  });
  final String userId;
  final int? contestId;

  /// 미리 선택할 팀
  final int? teamId;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<ProfileCubit>()..open(userId, contestId: contestId),
    child: _View(teamId: teamId),
  );
}

class _View extends StatefulWidget {
  const _View({this.teamId});
  final int? teamId;

  @override
  State<_View> createState() => _ViewState();
}

class _ViewState extends State<_View> {
  bool _sent = false;

  Future<void> _offer(ProfileEntity p, List<TeamCard> teams) async {
    final cubit = context.read<ProfileCubit>();
    final result = await showModalBottomSheet<(int, int, String)>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _OfferSheet(name: p.name, teams: teams, initialTeamId: widget.teamId),
    );
    if (result == null) return;
    final (teamId, roleId, message) = result;
    final err = await cubit.offer(teamId, roleId, message.isEmpty ? null : message);
    if (!mounted) return;
    if (err != null) return context.toast(err);
    setState(() => _sent = true);
    final team = teams.firstWhere((t) => t.id == teamId);
    context.toast('${p.name}님에게 제안 보냄 · 수락하면 ${team.name} 채팅방에 들어와요');
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<ProfileCubit>();
    final teams = cubit.offerableTeams;
    final p = cubit.data?.$1;
    return Scaffold(
      appBar: AppBar(title: const Text('프로필')),
      body: LoadView(
        state: cubit.state,
        onRetry: cubit.load,
        builder: (data) => _Body(data.$1),
      ),
      bottomNavigationBar: p == null || teams.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  onPressed: _sent ? null : () => _offer(p, teams),
                  child: Text(_sent ? '제안 보냄 · 답을 기다리는 중' : '내 팀에 제안하기'),
                ),
              ),
            ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body(this.p);
  final ProfileEntity p;

  @override
  Widget build(BuildContext context) {
    Widget qa(String q, String? a) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(q, style: const TextStyle(fontSize: 12, color: Palette.textMuted)),
          Text((a == null || a.isEmpty) ? '미작성' : a),
        ],
      ),
    );
    Widget stat(String label, String v) => Expanded(
      child: Column(
        children: [
          Text(v, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Palette.primary)),
          Text(label, style: const TextStyle(fontSize: 12, color: Palette.textSub)),
        ],
      ),
    );
    final s = p.stats;
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Container(
          color: Palette.white,
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Avatar(name: p.name, picture: p.picture, size: 56),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(p.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                        if (p.schoolVerified)
                          const Padding(
                            padding: EdgeInsets.only(left: 4),
                            child: Icon(Icons.verified, size: 18, color: Palette.primary),
                          ),
                      ],
                    ),
                    Text(
                      [
                        p.school?.shortName,
                        p.major,
                        if (p.admissionYear != null) '${p.admissionYear! % 100}학번',
                      ].whereType<String>().join(' · '),
                      style: const TextStyle(color: Palette.textSub),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              stat('완주율', s.completionRate == null ? '-' : '${s.completionRate!.round()}%'),
              stat('팀', '${s.teamCount}'),
              stat('대회', '${s.contestCount}'),
              stat('수상', '${s.awardCount}'),
            ],
          ),
        ),
        if (p.skills.isNotEmpty) ...[
          const SectionTitle('기술 스택'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [for (final k in p.skills) Chip2(k, color: Palette.textSub)],
            ),
          ),
        ],
        const SectionTitle('자기소개'),
        qa('한 줄 소개', p.intro.oneLiner),
        qa('맡고 싶은 역할', p.intro.role),
        qa('끝까지 해낸 경험', p.intro.experience),
        if (p.badges.isNotEmpty) ...[
          SectionTitle('배지 ${p.badges.length}'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final b in p.badges)
                  Chip2(b.label, color: Palette.accent, bg: Palette.accentSoft),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// 어떤 팀·역할로 제안할지
class _OfferSheet extends StatefulWidget {
  const _OfferSheet({required this.name, required this.teams, this.initialTeamId});
  final String name;
  final List<TeamCard> teams;
  final int? initialTeamId;

  @override
  State<_OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends State<_OfferSheet> {
  late int _teamId = widget.teams.any((t) => t.id == widget.initialTeamId)
      ? widget.initialTeamId!
      : widget.teams.first.id;
  int? _roleId;
  final _msg = TextEditingController();

  @override
  void dispose() {
    _msg.dispose();
    super.dispose();
  }

  List<RoleRef> get _roles => widget.teams
      .firstWhere((t) => t.id == _teamId)
      .openRoles
      .where((r) => (r.open ?? 0) > 0)
      .toList();

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${widget.name}님에게 제안하기',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        const Text('팀', style: TextStyle(color: Palette.textMuted)),
        for (final t in widget.teams)
          Card(
            margin: const EdgeInsets.only(top: 6),
            color: _teamId == t.id ? Palette.primarySoft : null,
            child: ListTile(
              dense: true,
              leading: Icon(
                _teamId == t.id ? Icons.check_circle : Icons.circle_outlined,
                color: _teamId == t.id ? Palette.primary : Palette.textMuted,
              ),
              title: Text(t.name),
              subtitle: Text('${t.contest.title} · ${t.memberCount}/${t.capacity}명'),
              onTap: () => setState(() {
                _teamId = t.id;
                _roleId = null;
              }),
            ),
          ),
        const SizedBox(height: 4),
        const Text('역할', style: TextStyle(color: Palette.textMuted)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          children: [
            for (final r in _roles)
              ChoiceChip(
                label: Text('${r.name} (${r.open}자리)'),
                selected: _roleId == r.id,
                onSelected: (_) => setState(() => _roleId = r.id),
              ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _msg,
          maxLength: 300,
          decoration: const InputDecoration(hintText: '한 줄 메시지 (선택)'),
        ),
        FilledButton(
          onPressed: _roleId == null
              ? null
              : () => Navigator.pop(context, (_teamId, _roleId!, _msg.text.trim())),
          child: const Text('제안 보내기'),
        ),
      ],
    ),
  );
}
