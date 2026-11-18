import 'package:json_annotation/json_annotation.dart';

@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum TeamStatus {
  recruiting('모집중'),
  confirmed('팀 확정'),
  submitted('제출됨'),
  completed('완료'),
  disbanded('해체');

  const TeamStatus(this.label);
  final String label;
}

@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum SubmissionStatus {
  preparing('준비중'),
  submitted('제출 완료'),
  revisionRequested('보완 요청'),
  approved('승인'),
  forwarded('전달 완료');

  const SubmissionStatus(this.label);
  final String label;
}

@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum InvitationType { apply, offer }

@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum InvitationStatus { pending, accepted, rejected, canceled }

@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum MessageType { text, system }

/// 내 학교 / 내 지역 / 전국
enum ScopeTab {
  school('내 학교'),
  region('내 지역'),
  national('전국');

  const ScopeTab(this.label);
  final String label;
}
