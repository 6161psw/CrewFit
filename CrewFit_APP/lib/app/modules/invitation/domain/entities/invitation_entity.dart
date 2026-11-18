import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'invitation_entity.freezed.dart';
part 'invitation_entity.g.dart';

@freezed
abstract class InvitationTeam with _$InvitationTeam {
  const factory InvitationTeam({
    required int id,
    required String name,
    required TeamStatus status,
    required ContestRef contest,
    required UserRef leader,
  }) = _InvitationTeam;

  factory InvitationTeam.fromJson(Map<String, dynamic> json) =>
      _$InvitationTeamFromJson(json);
}

@freezed
abstract class InvitationEntity with _$InvitationEntity {
  const factory InvitationEntity({
    required int id,
    required InvitationType type,
    required InvitationStatus status,
    required String direction,
    @Default('') String message,
    required DateTime createdAt,
    RoleRef? role,
    required InvitationTeam team,
    required UserSummary user,
  }) = _InvitationEntity;

  factory InvitationEntity.fromJson(Map<String, dynamic> json) =>
      _$InvitationEntityFromJson(json);
}
