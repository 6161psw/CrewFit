import 'package:crewfit/app/modules/common/domain/entities/refs.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'team_entity.freezed.dart';
part 'team_entity.g.dart';

@freezed
abstract class LastMessage with _$LastMessage {
  const factory LastMessage({
    required String content,
    required DateTime createdAt,
    String? senderName,
  }) = _LastMessage;

  factory LastMessage.fromJson(Map<String, dynamic> json) =>
      _$LastMessageFromJson(json);
}

@freezed
abstract class TeamCard with _$TeamCard {
  const factory TeamCard({
    required int id,
    required String name,
    @Default('') String description,
    required TeamStatus status,
    required ContestRef contest,
    required UserSummary leader,
    @Default(0) int memberCount,
    @Default(0) int capacity,
    @Default(0) int openCount,
    @Default([]) List<RoleRef> openRoles,
    @Default(0) int likeCount,
    @Default(false) bool isLiked,
    LastMessage? lastMessage,
    @Default(false) bool isLeader,
  }) = _TeamCard;

  factory TeamCard.fromJson(Map<String, dynamic> json) =>
      _$TeamCardFromJson(json);
}

@freezed
abstract class TeamPage with _$TeamPage {
  const factory TeamPage({
    @Default([]) List<TeamCard> items,
    @Default(0) int total,
  }) = _TeamPage;

  factory TeamPage.fromJson(Map<String, dynamic> json) =>
      _$TeamPageFromJson(json);
}

@freezed
abstract class MyTeams with _$MyTeams {
  const factory MyTeams({
    @Default([]) List<TeamCard> teams,
    @Default(MyTeamCounts()) MyTeamCounts counts,
  }) = _MyTeams;

  factory MyTeams.fromJson(Map<String, dynamic> json) =>
      _$MyTeamsFromJson(json);
}

@freezed
abstract class MyTeamCounts with _$MyTeamCounts {
  const factory MyTeamCounts({
    @Default(0) int joined,
    @Default(0) int sentApplications,
    @Default(0) int receivedOffers,
    @Default(0) int receivedApplications,
  }) = _MyTeamCounts;

  factory MyTeamCounts.fromJson(Map<String, dynamic> json) =>
      _$MyTeamCountsFromJson(json);
}

@freezed
abstract class TeamMember with _$TeamMember {
  const factory TeamMember({
    required String id,
    required String name,
    String? picture,
    SchoolRef? school,
    String? major,
    @Default(false) bool schoolVerified,
    RoleRef? role,
    @Default(false) bool isLeader,
  }) = _TeamMember;

  factory TeamMember.fromJson(Map<String, dynamic> json) =>
      _$TeamMemberFromJson(json);
}

@freezed
abstract class PendingInvitation with _$PendingInvitation {
  const factory PendingInvitation({
    required int id,
    required InvitationType type,
    int? roleId,
  }) = _PendingInvitation;

  factory PendingInvitation.fromJson(Map<String, dynamic> json) =>
      _$PendingInvitationFromJson(json);
}

@freezed
abstract class TeamMe with _$TeamMe {
  const factory TeamMe({
    @Default(false) bool isMember,
    @Default(false) bool isLeader,
    PendingInvitation? pendingInvitation,
  }) = _TeamMe;

  factory TeamMe.fromJson(Map<String, dynamic> json) => _$TeamMeFromJson(json);
}

@freezed
abstract class SubmissionRef with _$SubmissionRef {
  const factory SubmissionRef({
    required int id,
    required SubmissionStatus status,
  }) = _SubmissionRef;

  factory SubmissionRef.fromJson(Map<String, dynamic> json) =>
      _$SubmissionRefFromJson(json);
}

@freezed
abstract class TeamDetail with _$TeamDetail {
  const factory TeamDetail({
    required int id,
    required String name,
    @Default('') String description,
    required TeamStatus status,
    required String leaderId,
    required ContestRef contest,
    @Default([]) List<RoleRef> roles,
    @Default([]) List<TeamMember> members,
    @Default(0) int memberCount,
    @Default(0) int capacity,
    @Default(0) int openCount,
    @Default(0) int likeCount,
    @Default(false) bool isLiked,
    SubmissionRef? submission,
    @Default(TeamMe()) TeamMe me,
  }) = _TeamDetail;

  factory TeamDetail.fromJson(Map<String, dynamic> json) =>
      _$TeamDetailFromJson(json);
}
