import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/contest/presentation/bloc/contest_cubits.dart';
import 'package:crewfit/app/modules/contest/presentation/widgets/contest_tile.dart';
import 'package:crewfit/app/modules/team/presentation/widgets/team_tile.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

@RoutePage()
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<HomeCubit>()..load(),
    child: const _HomeView(),
  );
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<HomeCubit>();
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'CrewFit',
          style: TextStyle(color: Palette.primary, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: '지원·제안함',
            icon: const Icon(Icons.mail_outline),
            onPressed: () => context.router.push(const InvitationsRoute()),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                for (final s in ScopeTab.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(s.label),
                      selected: cubit.scope == s,
                      onSelected: (_) => cubit.setScope(s),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => cubit.load(silent: true),
        child: LoadView(
          state: cubit.state,
          onRetry: cubit.load,
          builder: (data) {
            final (contests, teams) = data;
            return ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                SectionTitle('마감 임박 대회 ${contests.total}'),
                if (contests.items.isEmpty) const EmptyView('대회 없음'),
                for (final c in contests.items)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: ContestTile(
                      contest: c,
                      onTap: () => context.router
                          .push(ContestDetailRoute(contestId: c.id))
                          .then((_) => cubit.load(silent: true)),
                    ),
                  ),
                SectionTitle('모집중인 팀 ${teams.total}'),
                if (teams.items.isEmpty) const EmptyView('모집중인 팀 없음'),
                for (final t in teams.items)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: TeamTile(
                      team: t,
                      onTap: () =>
                          context.router.push(TeamPreviewRoute(teamId: t.id)),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
