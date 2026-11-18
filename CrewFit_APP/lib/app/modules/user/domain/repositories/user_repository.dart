import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';

abstract class UserRepository {
  Future<MeEntity> me();
  Future<void> updateIntro({String? oneLiner, String? role, String? experience});
}
