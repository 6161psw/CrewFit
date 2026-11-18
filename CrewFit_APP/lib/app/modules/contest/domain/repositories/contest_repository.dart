import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/contest/domain/entities/contest_entity.dart';

abstract class ContestRepository {
  Future<ContestPage> list({ScopeTab? scope, String sort = 'deadline', String? q});
  Future<ContestDetail> detail(int id);
  Future<void> setInterest(int id, bool on);
}
