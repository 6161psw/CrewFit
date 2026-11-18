import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/team/data/data_sources/remote/team_api.dart';
import 'package:crewfit/app/modules/team/data/models/team_request_models.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/team/domain/repositories/team_repository.dart';
import 'package:injectable/injectable.dart';

@LazySingleton(as: TeamRepository)
class RestTeamRepository implements TeamRepository {
  final TeamApi _api;
  RestTeamRepository(this._api);

  @override
  Future<TeamPage> list({int? contestId, ScopeTab? scope, String sort = 'latest'}) =>
      _api.list(
        contestId: contestId,
        scope: scope?.name,
        sort: sort,
        limit: 50,
      );

  @override
  Future<MyTeams> mine() => _api.mine();

  @override
  Future<TeamDetail> create({
    required int contestId,
    required String name,
    String? description,
    required String myRole,
    required List<(String name, int capacity)> roles,
  }) => _api.create(
    CreateTeamRequestModel(
      contestId: contestId,
      name: name,
      description: description,
      myRole: myRole,
      roles: [
        for (final (n, c) in roles)
          TeamRoleRequestModel(name: n, capacity: c),
      ],
    ),
  );

  @override
  Future<TeamDetail> detail(int id) => _api.detail(id);

  @override
  Future<void> setLike(int id, bool on) => on ? _api.like(id) : _api.unlike(id);

  @override
  Future<void> leave(int id) => _api.leave(id);

  @override
  Future<void> apply(int id, {required int roleId, String? message}) =>
      _api.apply(id, ApplyRequestModel(roleId: roleId, message: message));

  @override
  Future<void> confirm(int id) => _api.confirm(id);
}
