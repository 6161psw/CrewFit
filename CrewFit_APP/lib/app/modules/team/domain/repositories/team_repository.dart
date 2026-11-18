import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';

abstract class TeamRepository {
  Future<TeamPage> list({int? contestId, ScopeTab? scope, String sort = 'latest'});
  Future<MyTeams> mine();
  Future<TeamDetail> create({
    required int contestId,
    required String name,
    String? description,
    required String myRole,
    required List<(String name, int capacity)> roles,
  });
  Future<TeamDetail> detail(int id);
  Future<void> setLike(int id, bool on);
  Future<void> leave(int id);
  Future<void> apply(int id, {required int roleId, String? message});
  Future<void> offer(int id, {required String userId, required int roleId, String? message});
  Future<void> confirm(int id);
}
