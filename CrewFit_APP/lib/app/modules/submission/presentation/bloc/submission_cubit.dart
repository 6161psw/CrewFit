import 'package:crewfit/app/modules/common/presentation/bloc/load_cubit.dart';
import 'package:crewfit/app/modules/submission/domain/entities/submission_entity.dart';
import 'package:crewfit/app/modules/submission/domain/repositories/submission_repository.dart';
import 'package:injectable/injectable.dart';

@injectable
class SubmissionCubit extends LoadCubit<SubmissionEntity> {
  final SubmissionRepository _repo;
  SubmissionCubit(this._repo);

  late final int teamId;

  void open(int id) {
    teamId = id;
    load();
  }

  @override
  Future<SubmissionEntity> fetch() => _repo.get(teamId);

  Future<String?> sign() => run(() => _repo.sign(teamId));
  Future<String?> submit() => run(() => _repo.submit(teamId));
}
