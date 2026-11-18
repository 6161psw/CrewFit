import 'package:crewfit/app/modules/user/data/data_sources/remote/user_api.dart';
import 'package:crewfit/app/modules/user/data/models/update_intro_request_model.dart';
import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:crewfit/app/modules/user/domain/repositories/user_repository.dart';
import 'package:injectable/injectable.dart';

@LazySingleton(as: UserRepository)
class RestUserRepository implements UserRepository {
  final UserApi _api;
  RestUserRepository(this._api);

  @override
  Future<MeEntity> me() => _api.me();

  @override
  Future<void> updateIntro({String? oneLiner, String? role, String? experience}) =>
      _api.updateIntro(
        UpdateIntroRequestModel(
          oneLiner: oneLiner,
          role: role,
          experience: experience,
        ),
      );
}
