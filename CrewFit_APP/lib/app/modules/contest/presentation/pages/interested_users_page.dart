import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/contest/presentation/bloc/contest_cubits.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// 관심 있는 사람 → 프로필 → 팀 제안
@RoutePage()
class InterestedUsersPage extends StatelessWidget {
  const InterestedUsersPage({
    super.key,
    required this.contestId,
    this.contestTitle,
    this.teamId,
  });
  final int contestId;
  final String? contestTitle;

  /// 채팅방 '팀원 찾기'에서 온 경우 제안할 팀
  final int? teamId;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<InterestedUsersCubit>()..open(contestId),
    child: _View(contestTitle: contestTitle, teamId: teamId),
  );
}

class _View extends StatelessWidget {
  const _View({this.contestTitle, this.teamId});
  final String? contestTitle;
  final int? teamId;

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<InterestedUsersCubit>();
    final counts = cubit.data?.counts;
    final filters = {
      'all': '전체 ${counts?.all ?? ''}',
      'school': '우리 학교 ${counts?.school ?? ''}',
      'region': '내 지역 ${counts?.region ?? ''}',
    };
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('관심 있는 사람'),
            if (contestTitle != null)
              Text(contestTitle!, style: const TextStyle(fontSize: 12, color: Palette.textSub)),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              textInputAction: TextInputAction.search,
              onSubmitted: cubit.search,
              decoration: const InputDecoration(
                hintText: '기술 스택 검색 (예: Flutter)',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                for (final e in filters.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(e.value),
                      selected: cubit.filter == e.key,
                      onSelected: (_) => cubit.setFilter(e.key),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: LoadView(
              state: cubit.state,
              onRetry: cubit.load,
              builder: (data) => data.items.isEmpty
                  ? const EmptyView('관심 표시한 사람이 없어요')
                  : ListView.separated(
                      itemCount: data.items.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final u = data.items[i];
                        return ListTile(
                          leading: Avatar(name: u.name, picture: u.picture),
                          title: Row(
                            children: [
                              Text(u.name),
                              if (u.schoolVerified)
                                const Padding(
                                  padding: EdgeInsets.only(left: 4),
                                  child: Icon(Icons.verified, size: 16, color: Palette.primary),
                                ),
                            ],
                          ),
                          subtitle: Text(
                            [
                              u.school?.shortName,
                              u.major,
                              if (u.skills.isNotEmpty) u.skills.take(3).join(', '),
                            ].whereType<String>().join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: u.completionRate == null
                              ? null
                              : Text(
                                  '완주율 ${u.completionRate!.round()}%',
                                  style: const TextStyle(fontSize: 12, color: Palette.textSub),
                                ),
                          onTap: () => context.router.push(
                            ProfileRoute(
                              userId: u.id,
                              contestId: cubit.id,
                              teamId: teamId,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
