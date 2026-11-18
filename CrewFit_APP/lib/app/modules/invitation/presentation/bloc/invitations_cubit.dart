import 'package:crewfit/app/modules/common/presentation/bloc/load_cubit.dart';
import 'package:crewfit/app/modules/invitation/domain/entities/invitation_entity.dart';
import 'package:crewfit/app/modules/invitation/domain/repositories/invitation_repository.dart';
import 'package:injectable/injectable.dart';

@injectable
class InvitationsCubit extends LoadCubit<List<InvitationEntity>> {
  final InvitationRepository _repo;
  InvitationsCubit(this._repo);

  bool received = true;

  void setBox({required bool received}) {
    this.received = received;
    load();
  }

  @override
  Future<List<InvitationEntity>> fetch() => _repo.list(received: received);

  Future<String?> accept(int id) => run(() => _repo.accept(id));
  Future<String?> reject(int id) => run(() => _repo.reject(id));
  Future<String?> cancel(int id) => run(() => _repo.cancel(id));
}
