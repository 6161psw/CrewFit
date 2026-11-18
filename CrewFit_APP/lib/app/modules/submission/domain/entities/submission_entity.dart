import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'submission_entity.freezed.dart';
part 'submission_entity.g.dart';

@freezed
abstract class SubmissionMember with _$SubmissionMember {
  const factory SubmissionMember({
    required String id,
    required String name,
    String? role,
    @Default(false) bool isLeader,
    String? school,
    String? major,
    @Default(false) bool schoolVerified,
    @Default(false) bool signed,
  }) = _SubmissionMember;

  factory SubmissionMember.fromJson(Map<String, dynamic> json) =>
      _$SubmissionMemberFromJson(json);
}

@freezed
abstract class SubmissionDocument with _$SubmissionDocument {
  const factory SubmissionDocument({
    required int id,
    required String type,
    required String title,
    String? description,
    @Default('PENDING') String status,
    @Default(false) bool auto,
    String? fileName,
    @Default(false) bool revisionRequested,
    int? signedCount,
  }) = _SubmissionDocument;

  factory SubmissionDocument.fromJson(Map<String, dynamic> json) =>
      _$SubmissionDocumentFromJson(json);
}

@freezed
abstract class RevisionReason with _$RevisionReason {
  const factory RevisionReason({required String code, required String label}) =
      _RevisionReason;

  factory RevisionReason.fromJson(Map<String, dynamic> json) =>
      _$RevisionReasonFromJson(json);
}

@freezed
abstract class Revision with _$Revision {
  const factory Revision({
    @Default([]) List<RevisionReason> reasons,
    String? message,
    DateTime? deadline,
  }) = _Revision;

  factory Revision.fromJson(Map<String, dynamic> json) =>
      _$RevisionFromJson(json);
}

@freezed
abstract class TimelineStep with _$TimelineStep {
  const factory TimelineStep({
    required String step,
    required String label,
    DateTime? at,
    @Default(false) bool done,
    @Default(false) bool revision,
  }) = _TimelineStep;

  factory TimelineStep.fromJson(Map<String, dynamic> json) =>
      _$TimelineStepFromJson(json);
}

@freezed
abstract class SubmissionEntity with _$SubmissionEntity {
  const factory SubmissionEntity({
    required int id,
    required int teamId,
    required String teamName,
    required UserRef leader,
    required SubmissionStatus status,
    required ContestRef contest,
    @Default([]) List<SubmissionMember> members,
    @Default(false) bool allSchoolVerified,
    @Default([]) List<SubmissionDocument> documents,
    @Default(0) int readyCount,
    @Default(0) int totalCount,
    @Default(false) bool canSubmit,
    @Default(false) bool mySigned,
    DateTime? submittedAt,
    Revision? revision,
    @Default([]) List<TimelineStep> timeline,
  }) = _SubmissionEntity;

  factory SubmissionEntity.fromJson(Map<String, dynamic> json) =>
      _$SubmissionEntityFromJson(json);
}
