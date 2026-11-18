import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'me_entity.freezed.dart';
part 'me_entity.g.dart';

@freezed
abstract class MeEntity with _$MeEntity {
  const factory MeEntity({
    required String id,
    required String email,
    required String name,
    String? picture,
    SchoolRef? school,
    @Default(false) bool schoolVerified,
    String? major,
    int? admissionYear,
    @Default([]) List<String> skills,
    @Default(IntroEntity()) IntroEntity intro,
    @Default(StatsEntity()) StatsEntity stats,
    @Default([]) List<BadgeEntity> badges,
    @Default('USER') String role,
    @Default(0) int interestCount,
  }) = _MeEntity;

  factory MeEntity.fromJson(Map<String, dynamic> json) =>
      _$MeEntityFromJson(json);
}

@freezed
abstract class IntroEntity with _$IntroEntity {
  const factory IntroEntity({String? oneLiner, String? role, String? experience}) =
      _IntroEntity;

  factory IntroEntity.fromJson(Map<String, dynamic> json) =>
      _$IntroEntityFromJson(json);
}

@freezed
abstract class StatsEntity with _$StatsEntity {
  const factory StatsEntity({
    num? completionRate,
    @Default(0) int badgeCount,
    @Default(0) int teamCount,
    @Default(0) int contestCount,
    @Default(0) int awardCount,
  }) = _StatsEntity;

  factory StatsEntity.fromJson(Map<String, dynamic> json) =>
      _$StatsEntityFromJson(json);
}

@freezed
abstract class BadgeEntity with _$BadgeEntity {
  const factory BadgeEntity({
    required String code,
    required String label,
    @Default('') String description,
  }) = _BadgeEntity;

  factory BadgeEntity.fromJson(Map<String, dynamic> json) =>
      _$BadgeEntityFromJson(json);
}
