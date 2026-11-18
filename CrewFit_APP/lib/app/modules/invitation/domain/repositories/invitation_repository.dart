import 'package:crewfit/app/modules/invitation/domain/entities/invitation_entity.dart';

abstract class InvitationRepository {
  Future<List<InvitationEntity>> list({required bool received});
  Future<void> accept(int id);
  Future<void> reject(int id);
  Future<void> cancel(int id);
}
