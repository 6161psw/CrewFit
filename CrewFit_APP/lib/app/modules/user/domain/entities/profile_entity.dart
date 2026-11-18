import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/user/domain/entities/me_entity.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'profile_entity.freezed.dart';
part 'profile_entity.g.dart';

/// GET /users/:id (H-05 프로필 상세)
@freezed
abstract class ProfileEntity with _$ProfileEntity {
  const factory ProfileEntity({
    required String id,
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
  }) = _ProfileEntity;

  factory ProfileEntity.fromJson(Map<String, dynamic> json) =>
      _$ProfileEntityFromJson(json);
}
