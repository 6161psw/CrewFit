import 'dart:async';

import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/bloc/load_cubit.dart';
import 'package:crewfit/app/modules/contest/domain/entities/contest_entity.dart';
import 'package:crewfit/app/modules/contest/domain/repositories/contest_repository.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/team/domain/repositories/team_repository.dart';
import 'package:injectable/injectable.dart';

/// H-01 홈: 범위 탭별 대회 + 모집중 팀
@injectable
class HomeCubit extends LoadCubit<(ContestPage, TeamPage)> {
  final ContestRepository _contests;
  final TeamRepository _teams;
  HomeCubit(this._contests, this._teams);

  ScopeTab scope = ScopeTab.school;

  void setScope(ScopeTab value) {
    scope = value;
    load();
  }

  @override
  Future<(ContestPage, TeamPage)> fetch() async {
    final r = await (
      _contests.list(scope: scope),
      _teams.list(scope: scope, sort: 'latest'),
    ).wait;
    return r;
  }
}

/// 대회 상세 + 이 대회 모집 팀
@injectable
class ContestDetailCubit extends LoadCubit<(ContestDetail, TeamPage)> {
  final ContestRepository _contests;
  final TeamRepository _teams;
  ContestDetailCubit(this._contests, this._teams);

  late final int id;

  void open(int contestId) {
    id = contestId;
    load();
  }

  @override
  Future<(ContestDetail, TeamPage)> fetch() =>
      (_contests.detail(id), _teams.list(contestId: id)).wait;

  Future<String?> toggleInterest() {
    final on = !(data?.$1.isInterested ?? false);
    return run(() => _contests.setInterest(id, on));
  }
}

/// 관심 있는 사람 (팀원 찾기)
@injectable
class InterestedUsersCubit extends LoadCubit<InterestedUsers> {
  final ContestRepository _contests;
  InterestedUsersCubit(this._contests);

  late final int id;
  String filter = 'all';
  String skill = '';

  void open(int contestId) {
    id = contestId;
    load();
  }

  void setFilter(String value) {
    filter = value;
    load(silent: true);
  }

  void search(String value) {
    skill = value.trim();
    load(silent: true);
  }

  @override
  Future<InterestedUsers> fetch() => _contests.interestedUsers(
    id,
    filter: filter,
    skill: skill.isEmpty ? null : skill,
  );
}
