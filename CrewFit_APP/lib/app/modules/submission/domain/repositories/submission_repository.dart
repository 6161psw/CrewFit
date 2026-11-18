import 'package:crewfit/app/modules/submission/domain/entities/submission_entity.dart';

abstract class SubmissionRepository {
  Future<SubmissionEntity> get(int teamId);
  Future<void> sign(int teamId);
  Future<void> submit(int teamId);
}
