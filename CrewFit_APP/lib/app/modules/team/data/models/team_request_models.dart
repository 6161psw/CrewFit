import 'package:freezed_annotation/freezed_annotation.dart';

part 'team_request_models.freezed.dart';
part 'team_request_models.g.dart';

@freezed
abstract class TeamRoleRequestModel with _$TeamRoleRequestModel {
  const factory TeamRoleRequestModel({
    required String name,
    @Default(1) int capacity,
  }) = _TeamRoleRequestModel;

  factory TeamRoleRequestModel.fromJson(Map<String, dynamic> json) =>
      _$TeamRoleRequestModelFromJson(json);
}

@freezed
abstract class CreateTeamRequestModel with _$CreateTeamRequestModel {
  const factory CreateTeamRequestModel({
    required int contestId,
    required String name,
    String? description,
    required List<TeamRoleRequestModel> roles,
    required String myRole,
    @Default(false) bool badgeHidden,
  }) = _CreateTeamRequestModel;

  factory CreateTeamRequestModel.fromJson(Map<String, dynamic> json) =>
      _$CreateTeamRequestModelFromJson(json);
}

@freezed
abstract class ApplyRequestModel with _$ApplyRequestModel {
  const factory ApplyRequestModel({required int roleId, String? message}) =
      _ApplyRequestModel;

  factory ApplyRequestModel.fromJson(Map<String, dynamic> json) =>
      _$ApplyRequestModelFromJson(json);
}
