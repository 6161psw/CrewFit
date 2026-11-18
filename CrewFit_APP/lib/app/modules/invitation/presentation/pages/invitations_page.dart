import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/utils/format.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/invitation/domain/entities/invitation_entity.dart';
import 'package:crewfit/app/modules/invitation/presentation/bloc/invitations_cubit.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// 지원·제안함 (받은 / 보낸)
@RoutePage()
class InvitationsPage extends StatelessWidget {
  const InvitationsPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<InvitationsCubit>()..load(),
    child: const _View(),
  );
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<InvitationsCubit>();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('지원·제안함'),
          bottom: TabBar(
            onTap: (i) => cubit.setBox(received: i == 0),
            tabs: const [Tab(text: '받은'), Tab(text: '보낸')],
          ),
        ),
        body: LoadView(
          state: cubit.state,
          onRetry: cubit.load,
          builder: (list) => list.isEmpty
              ? const EmptyView('내역 없음')
              : RefreshIndicator(
                  onRefresh: () => cubit.load(silent: true),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _Item(list[i], received: cubit.received),
                  ),
                ),
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item(this.inv, {required this.received});
  final InvitationEntity inv;
  final bool received;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<InvitationsCubit>();
    final pending = inv.status == InvitationStatus.pending;
    final typeLabel = inv.type == InvitationType.apply ? '지원' : '제안';

    Future<void> act(Future<String?> Function(int) f, String done) async {
      final err = await f(inv.id);
      if (context.mounted) context.toast(err ?? done);
    }

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.router.push(TeamPreviewRoute(teamId: inv.team.id)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Chip2(typeLabel, color: Palette.accent, bg: Palette.accentSoft),
                  const SizedBox(width: 6),
                  Chip2(_statusLabel(inv.status), color: pending ? Palette.primary : Palette.textMuted),
                  const Spacer(),
                  Text(dateLabel(inv.createdAt), style: const TextStyle(fontSize: 12, color: Palette.textMuted)),
                ],
              ),
              const SizedBox(height: 8),
              Text(inv.team.name, style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(inv.team.contest.title, style: const TextStyle(fontSize: 12, color: Palette.textSub)),
              const SizedBox(height: 6),
              Text('${inv.user.name}${inv.role == null ? '' : ' · ${inv.role!.name}'}'),
              if (inv.message.isNotEmpty)
                Text('"${inv.message}"', style: const TextStyle(color: Palette.textSub)),
              if (pending) ...[
                const SizedBox(height: 10),
                Row(
                  children: received
                      ? [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => act(cubit.reject, '거절함'),
                              child: const Text('거절'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => act(cubit.accept, '수락함'),
                              child: const Text('수락'),
                            ),
                          ),
                        ]
                      : [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => act(cubit.cancel, '취소함'),
                              child: const Text('취소'),
                            ),
                          ),
                        ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel(InvitationStatus s) => switch (s) {
    InvitationStatus.pending => '대기',
    InvitationStatus.accepted => '수락',
    InvitationStatus.rejected => '거절',
    InvitationStatus.canceled => '취소',
  };
}
