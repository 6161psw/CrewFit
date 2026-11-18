import 'package:crewfit/app/modules/submission/data/data_sources/remote/submission_api.dart';
import 'package:crewfit/app/modules/submission/domain/entities/submission_entity.dart';
import 'package:crewfit/app/modules/submission/domain/repositories/submission_repository.dart';
import 'package:injectable/injectable.dart';

@LazySingleton(as: SubmissionRepository)
class RestSubmissionRepository implements SubmissionRepository {
  final SubmissionApi _api;
  RestSubmissionRepository(this._api);

  @override
  Future<SubmissionEntity> get(int teamId) => _api.get(teamId);

  @override
  Future<void> sign(int teamId) => _api.sign(teamId);

  @override
  Future<void> submit(int teamId) => _api.submit(teamId);
}
