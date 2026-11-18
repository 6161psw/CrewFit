import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/contest/data/data_sources/remote/contest_api.dart';
import 'package:crewfit/app/modules/contest/domain/entities/contest_entity.dart';
import 'package:crewfit/app/modules/contest/domain/repositories/contest_repository.dart';
import 'package:injectable/injectable.dart';

@LazySingleton(as: ContestRepository)
class RestContestRepository implements ContestRepository {
  final ContestApi _api;
  RestContestRepository(this._api);

  @override
  Future<ContestPage> list({
    ScopeTab? scope,
    String sort = 'deadline',
    String? q,
  }) => _api.list(scope: scope?.name, sort: sort, q: q, limit: 50);

  @override
  Future<ContestDetail> detail(int id) => _api.detail(id);

  @override
  Future<InterestedUsers> interestedUsers(
    int id, {
    String filter = 'all',
    String? skill,
  }) => _api.interestedUsers(id, filter: filter, skill: skill, limit: 100);

  @override
  Future<void> setInterest(int id, bool on) =>
      on ? _api.addInterest(id) : _api.removeInterest(id);
}
