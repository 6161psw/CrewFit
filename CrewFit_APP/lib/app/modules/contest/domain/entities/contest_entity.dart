import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'contest_entity.freezed.dart';
part 'contest_entity.g.dart';

@freezed
abstract class ContestCard with _$ContestCard {
  const factory ContestCard({
    required int id,
    required String title,
    @Default('') String organizer,
    @Default('') String categoryLabel,
    @Default([]) List<String> tags,
    @Default('NATIONAL') String scope,
    required DateTime deadline,
    @Default(0) int dDay,
    @Default(1) int minTeamSize,
    @Default(1) int maxTeamSize,
    @Default(0) int interestCount,
    @Default(0) int recruitingTeamCount,
    @Default(false) bool isInterested,
  }) = _ContestCard;

  factory ContestCard.fromJson(Map<String, dynamic> json) =>
      _$ContestCardFromJson(json);
}

@freezed
abstract class ContestPage with _$ContestPage {
  const factory ContestPage({
    @Default([]) List<ContestCard> items,
    @Default(0) int total,
  }) = _ContestPage;

  factory ContestPage.fromJson(Map<String, dynamic> json) =>
      _$ContestPageFromJson(json);
}

@freezed
abstract class ContestDetail with _$ContestDetail {
  const factory ContestDetail({
    required int id,
    required String title,
    @Default('') String organizer,
    @Default('') String categoryLabel,
    @Default([]) List<String> tags,
    required DateTime deadline,
    @Default(0) int dDay,
    @Default(1) int minTeamSize,
    @Default(1) int maxTeamSize,
    @Default(0) int interestCount,
    @Default(false) bool isInterested,
    @Default('') String description,
    @Default('') String submitTo,
    String? linkUrl,
    @Default([]) List<RequiredDocument> requiredDocuments,
    MyTeamRef? myTeam,
  }) = _ContestDetail;

  factory ContestDetail.fromJson(Map<String, dynamic> json) =>
      _$ContestDetailFromJson(json);
}

@freezed
abstract class RequiredDocument with _$RequiredDocument {
  const factory RequiredDocument({
    required int id,
    required String title,
    String? description,
  }) = _RequiredDocument;

  factory RequiredDocument.fromJson(Map<String, dynamic> json) =>
      _$RequiredDocumentFromJson(json);
}

@freezed
abstract class MyTeamRef with _$MyTeamRef {
  const factory MyTeamRef({
    required int id,
    required String name,
    required TeamStatus status,
  }) = _MyTeamRef;

  factory MyTeamRef.fromJson(Map<String, dynamic> json) =>
      _$MyTeamRefFromJson(json);
}
