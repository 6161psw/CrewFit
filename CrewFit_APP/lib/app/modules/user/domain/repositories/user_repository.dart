import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:crewfit/app/modules/user/domain/entities/profile_entity.dart';

abstract class UserRepository {
  Future<MeEntity> me();
  Future<ProfileEntity> profile(String id);
  Future<void> updateIntro({String? oneLiner, String? role, String? experience});
}
