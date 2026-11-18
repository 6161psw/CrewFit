import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/env.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// MY: 프로필·자소서·배지·로그아웃
@RoutePage()
class MePage extends StatelessWidget {
  const MePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthBloc>();
    final state = auth.state;
    if (state is! Authenticated) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final me = state.me;
    return Scaffold(
      appBar: AppBar(title: const Text('MY')),
      body: RefreshIndicator(
        onRefresh: () async => auth.add(const AuthEvent.reloadMe()),
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            _Profile(me),
            _Stats(me.stats),
            SectionTitle(
              '자기소개',
              trailing: TextButton(
                onPressed: () => context.router.push(IntroEditRoute(intro: me.intro)),
                child: const Text('수정'),
              ),
            ),
            _qa('한 줄 소개', me.intro.oneLiner),
            _qa('맡고 싶은 역할', me.intro.role),
            _qa('끝까지 해낸 경험', me.intro.experience),
            SectionTitle('배지 ${me.badges.length}'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: me.badges.isEmpty
                  ? const Text('아직 없음', style: TextStyle(color: Palette.textMuted))
                  : Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final b in me.badges)
                          Tooltip(
                            message: b.description,
                            child: Chip2(b.label, color: Palette.accent, bg: Palette.accentSoft),
                          ),
                      ],
                    ),
            ),
            const SizedBox(height: 32),
            ListTile(
              leading: const Icon(Icons.logout, color: Palette.danger),
              title: const Text('로그아웃', style: TextStyle(color: Palette.danger)),
              onTap: () => auth.add(const AuthEvent.logout()),
            ),
            Center(
              child: Text(
                Env.apiUrl,
                style: const TextStyle(fontSize: 11, color: Palette.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qa(String q, String? a) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(q, style: const TextStyle(fontSize: 12, color: Palette.textMuted)),
        const SizedBox(height: 2),
        Text(
          (a == null || a.isEmpty) ? '미작성' : a,
          style: TextStyle(color: (a == null || a.isEmpty) ? Palette.textMuted : Palette.text),
        ),
      ],
    ),
  );
}

class _Profile extends StatelessWidget {
  const _Profile(this.me);
  final MeEntity me;

  @override
  Widget build(BuildContext context) => Container(
    color: Palette.white,
    padding: const EdgeInsets.all(16),
    child: Row(
      children: [
        Avatar(name: me.name, picture: me.picture, size: 56),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(me.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  if (me.schoolVerified)
                    const Padding(
                      padding: EdgeInsets.only(left: 4),
                      child: Icon(Icons.verified, size: 18, color: Palette.primary),
                    ),
                ],
              ),
              Text(
                [me.school?.shortName, me.major, if (me.admissionYear != null) '${me.admissionYear! % 100}학번']
                    .whereType<String>()
                    .join(' · '),
                style: const TextStyle(color: Palette.textSub),
              ),
              Text(me.email, style: const TextStyle(fontSize: 12, color: Palette.textMuted)),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Stats extends StatelessWidget {
  const _Stats(this.s);
  final StatsEntity s;

  @override
  Widget build(BuildContext context) {
    Widget cell(String label, String v) => Expanded(
      child: Column(
        children: [
          Text(v, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Palette.primary)),
          Text(label, style: const TextStyle(fontSize: 12, color: Palette.textSub)),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          cell('완주율', s.completionRate == null ? '-' : '${s.completionRate!.round()}%'),
          cell('팀', '${s.teamCount}'),
          cell('대회', '${s.contestCount}'),
          cell('수상', '${s.awardCount}'),
        ],
      ),
    );
  }
}
