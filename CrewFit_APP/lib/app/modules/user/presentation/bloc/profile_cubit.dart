import 'dart:async';

import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/bloc/load_cubit.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/team/domain/repositories/team_repository.dart';
import 'package:crewfit/app/modules/user/domain/entities/profile_entity.dart';
import 'package:crewfit/app/modules/user/domain/repositories/user_repository.dart';
import 'package:injectable/injectable.dart';

/// 프로필 + 내가 팀장인 모집중 팀 (제안 대상)
@injectable
class ProfileCubit extends LoadCubit<(ProfileEntity, MyTeams)> {
  final UserRepository _users;
  final TeamRepository _teams;
  ProfileCubit(this._users, this._teams);

  late final String userId;
  int? contestId;

  void open(String id, {int? contestId}) {
    userId = id;
    this.contestId = contestId;
    load();
  }

  @override
  Future<(ProfileEntity, MyTeams)> fetch() =>
      (_users.profile(userId), _teams.mine()).wait;

  /// 제안 가능한 팀: 팀장 · 모집중 · 빈자리 · (대회 지정 시) 같은 대회
  List<TeamCard> get offerableTeams => [
    for (final t in data?.$2.teams ?? <TeamCard>[])
      if (t.isLeader &&
          t.status == TeamStatus.recruiting &&
          t.openCount > 0 &&
          (contestId == null || t.contest.id == contestId))
        t,
  ];

  Future<String?> offer(int teamId, int roleId, String? message) => run(
    () => _teams.offer(teamId, userId: userId, roleId: roleId, message: message),
  );
}
