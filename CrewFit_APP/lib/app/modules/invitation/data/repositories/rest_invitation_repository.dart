import 'package:crewfit/app/modules/invitation/data/data_sources/remote/invitation_api.dart';
import 'package:crewfit/app/modules/invitation/domain/entities/invitation_entity.dart';
import 'package:crewfit/app/modules/invitation/domain/repositories/invitation_repository.dart';
import 'package:injectable/injectable.dart';

@LazySingleton(as: InvitationRepository)
class RestInvitationRepository implements InvitationRepository {
  final InvitationApi _api;
  RestInvitationRepository(this._api);

  @override
  Future<List<InvitationEntity>> list({required bool received}) =>
      _api.list(received ? 'received' : 'sent');

  @override
  Future<void> accept(int id) => _api.accept(id);

  @override
  Future<void> reject(int id) => _api.reject(id);

  @override
  Future<void> cancel(int id) => _api.cancel(id);
}
