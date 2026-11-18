import 'package:crewfit/app/modules/common/presentation/bloc/action_cubit.dart';
import 'package:crewfit/app/modules/user/domain/repositories/user_repository.dart';
import 'package:injectable/injectable.dart';

@injectable
class IntroCubit extends ActionCubit {
  final UserRepository _repo;
  IntroCubit(this._repo);

  Future<String?> save({String? oneLiner, String? role, String? experience}) async {
    final (_, err) = await run<bool>(() async {
      await _repo.updateIntro(
        oneLiner: oneLiner,
        role: role,
        experience: experience,
      );
      return true;
    });
    return err;
  }
}
