import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/presentation/utils/format.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/contest/domain/entities/contest_entity.dart';
import 'package:crewfit/app/modules/contest/presentation/bloc/contest_cubits.dart';
import 'package:crewfit/app/modules/team/presentation/widgets/team_tile.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

@RoutePage()
class ContestDetailPage extends StatelessWidget {
  const ContestDetailPage({super.key, required this.contestId});
  final int contestId;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<ContestDetailCubit>()..open(contestId),
    child: const _View(),
  );
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<ContestDetailCubit>();
    final detail = cubit.data?.$1;
    return Scaffold(
      appBar: AppBar(
        title: const Text('대회 상세'),
        actions: [
          if (detail != null)
            IconButton(
              icon: Icon(
                detail.isInterested ? Icons.favorite : Icons.favorite_border,
                color: detail.isInterested ? Palette.danger : null,
              ),
              onPressed: () async {
                final err = await cubit.toggleInterest();
                if (err != null && context.mounted) context.toast(err);
              },
            ),
        ],
      ),
      body: LoadView(
        state: cubit.state,
        onRetry: cubit.load,
        builder: (data) {
          final (c, teams) = data;
          return RefreshIndicator(
            onRefresh: () => cubit.load(silent: true),
            child: ListView(
              padding: const EdgeInsets.only(bottom: 100),
              children: [
                _Header(c),
                SectionTitle('제출 서류 ${c.requiredDocuments.length}'),
                for (final d in c.requiredDocuments)
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.description_outlined),
                    title: Text(d.title),
                    subtitle: d.description == null ? null : Text(d.description!),
                  ),
                SectionTitle('모집중인 팀 ${teams.total}'),
                if (teams.items.isEmpty) const EmptyView('첫 팀을 만들어 보세요'),
                for (final t in teams.items)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: TeamTile(
                      team: t,
                      onTap: () => context.router
                          .push(TeamPreviewRoute(teamId: t.id))
                          .then((_) => cubit.load(silent: true)),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: detail == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: detail.myTeam != null
                    ? FilledButton(
                        onPressed: () => context.router.push(
                          ChatRoomRoute(
                            teamId: detail.myTeam!.id,
                            teamName: detail.myTeam!.name,
                          ),
                        ),
                        child: Text('내 팀 채팅 · ${detail.myTeam!.name}'),
                      )
                    : FilledButton(
                        onPressed: detail.dDay < 0
                            ? null
                            : () => context.router
                                  .push(
                                    CreateTeamRoute(
                                      contestId: detail.id,
                                      contestTitle: detail.title,
                                    ),
                                  )
                                  .then((_) => cubit.load(silent: true)),
                        child: const Text('팀 만들기'),
                      ),
              ),
            ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.c);
  final ContestDetail c;

  @override
  Widget build(BuildContext context) => Container(
    color: Palette.white,
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Chip2(dDayLabel(c.dDay), color: c.dDay <= 7 ? Palette.danger : Palette.primary),
            const SizedBox(width: 6),
            if (c.categoryLabel.isNotEmpty) Chip2(c.categoryLabel, color: Palette.textSub),
          ],
        ),
        const SizedBox(height: 10),
        Text(c.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(c.organizer, style: const TextStyle(color: Palette.textSub)),
        const SizedBox(height: 12),
        _row('마감', dateLabel(c.deadline)),
        _row('팀 인원', '${c.minTeamSize}~${c.maxTeamSize}명'),
        _row('제출처', c.submitTo.isEmpty ? '-' : c.submitTo),
        _row('관심', '${c.interestCount}명'),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => context.router.push(
              InterestedUsersRoute(contestId: c.id, contestTitle: c.title),
            ),
            icon: const Icon(Icons.people_outline, size: 18),
            label: const Text('관심 있는 사람 보기 · 팀원 찾기'),
          ),
        ),
        if (c.description.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(c.description),
        ],
      ],
    ),
  );

  Widget _row(String k, String v) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(
      children: [
        SizedBox(
          width: 64,
          child: Text(k, style: const TextStyle(color: Palette.textMuted)),
        ),
        Expanded(child: Text(v)),
      ],
    ),
  );
}
