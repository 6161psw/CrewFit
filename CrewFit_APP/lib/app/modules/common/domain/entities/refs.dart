import 'package:freezed_annotation/freezed_annotation.dart';

part 'refs.freezed.dart';
part 'refs.g.dart';

@freezed
abstract class SchoolRef with _$SchoolRef {
  const factory SchoolRef({
    required int id,
    String? name,
    required String shortName,
    String? region,
  }) = _SchoolRef;

  factory SchoolRef.fromJson(Map<String, dynamic> json) =>
      _$SchoolRefFromJson(json);
}

@freezed
abstract class UserRef with _$UserRef {
  const factory UserRef({
    required String id,
    required String name,
    String? picture,
  }) = _UserRef;

  factory UserRef.fromJson(Map<String, dynamic> json) =>
      _$UserRefFromJson(json);
}

/// 대회 요약 (팀/초대/제출 응답 공통)
@freezed
abstract class ContestRef with _$ContestRef {
  const factory ContestRef({
    required int id,
    required String title,
    String? categoryLabel,
    DateTime? deadline,
    String? submitTo,
    int? minTeamSize,
    int? maxTeamSize,
  }) = _ContestRef;

  factory ContestRef.fromJson(Map<String, dynamic> json) =>
      _$ContestRefFromJson(json);
}

/// 팀 역할 (openRoles / roles / member.role 공통)
@freezed
abstract class RoleRef with _$RoleRef {
  const factory RoleRef({
    required int id,
    required String name,
    int? capacity,
    int? filled,
    int? open,
  }) = _RoleRef;

  factory RoleRef.fromJson(Map<String, dynamic> json) =>
      _$RoleRefFromJson(json);
}

@freezed
abstract class UserSummary with _$UserSummary {
  const factory UserSummary({
    required String id,
    required String name,
    String? picture,
    SchoolRef? school,
    @Default(false) bool schoolVerified,
    String? major,
    int? admissionYear,
    @Default([]) List<String> skills,
    num? completionRate,
    int? badgeCount,
  }) = _UserSummary;

  factory UserSummary.fromJson(Map<String, dynamic> json) =>
      _$UserSummaryFromJson(json);
}
