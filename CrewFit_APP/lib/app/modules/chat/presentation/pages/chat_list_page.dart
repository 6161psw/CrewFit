import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/presentation/utils/format.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/team/presentation/bloc/team_cubits.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// 채팅 탭: 내 팀 채팅방
@RoutePage()
class ChatListPage extends StatelessWidget {
  const ChatListPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<MyTeamsCubit>()..load(),
    child: const _View(),
  );
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<MyTeamsCubit>();
    return Scaffold(
      appBar: AppBar(title: const Text('채팅')),
      body: RefreshIndicator(
        onRefresh: () => cubit.load(silent: true),
        child: LoadView(
          state: cubit.state,
          onRetry: cubit.load,
          builder: (data) => ListView(
            children: [
              InkWell(
                onTap: () => context.router
                    .push(const InvitationsRoute())
                    .then((_) => cubit.load(silent: true)),
                child: Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Palette.primarySoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _count('받은 지원', data.counts.receivedApplications),
                      _count('받은 제안', data.counts.receivedOffers),
                      _count('보낸 지원', data.counts.sentApplications),
                    ],
                  ),
                ),
              ),
              if (data.teams.isEmpty) const EmptyView('참여 중인 팀 없음'),
              for (final t in data.teams)
                ListTile(
                  leading: Avatar(name: t.name),
                  title: Text(t.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                    t.lastMessage == null
                        ? t.contest.title
                        : '${t.lastMessage!.senderName ?? ''} ${t.lastMessage!.content}'.trim(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Chip2(t.status.label),
                      if (t.lastMessage != null)
                        Text(
                          timeLabel(t.lastMessage!.createdAt),
                          style: const TextStyle(fontSize: 11, color: Palette.textMuted),
                        ),
                    ],
                  ),
                  onTap: () => context.router
                      .push(ChatRoomRoute(teamId: t.id, teamName: t.name))
                      .then((_) => cubit.load(silent: true)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _count(String label, int n) => Column(
    children: [
      Text('$n', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Palette.primary)),
      Text(label, style: const TextStyle(fontSize: 12, color: Palette.textSub)),
    ],
  );
}
