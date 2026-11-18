import 'package:crewfit/app/modules/common/presentation/bloc/action_cubit.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/modules/team/domain/repositories/team_repository.dart';
import 'package:injectable/injectable.dart';

@injectable
class CreateTeamCubit extends ActionCubit {
  final TeamRepository _repo;
  CreateTeamCubit(this._repo);

  Future<(TeamDetail?, String?)> create({
    required int contestId,
    required String name,
    String? description,
    required String myRole,
    required List<(String, int)> roles,
  }) => run(
    () => _repo.create(
      contestId: contestId,
      name: name,
      description: description,
      myRole: myRole,
      roles: roles,
    ),
  );
}
