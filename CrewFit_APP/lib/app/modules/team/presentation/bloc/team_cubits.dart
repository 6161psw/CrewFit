import 'package:crewfit/app/modules/common/presentation/bloc/load_cubit.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/team/domain/repositories/team_repository.dart';
import 'package:injectable/injectable.dart';

@injectable
class TeamDetailCubit extends LoadCubit<TeamDetail> {
  final TeamRepository _repo;
  TeamDetailCubit(this._repo);

  late final int id;

  void open(int teamId) {
    id = teamId;
    load();
  }

  @override
  Future<TeamDetail> fetch() => _repo.detail(id);

  Future<String?> toggleLike() =>
      run(() => _repo.setLike(id, !(data?.isLiked ?? false)));

  Future<String?> apply(int roleId, String? message) =>
      run(() => _repo.apply(id, roleId: roleId, message: message));

  Future<String?> leave() => run(() => _repo.leave(id));

  Future<String?> confirm() => run(() => _repo.confirm(id));
}

/// 채팅 탭: 내 팀 목록 + 지원/제안 카운트
@injectable
class MyTeamsCubit extends LoadCubit<MyTeams> {
  final TeamRepository _repo;
  MyTeamsCubit(this._repo);

  @override
  Future<MyTeams> fetch() => _repo.mine();
}
