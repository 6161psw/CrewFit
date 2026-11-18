import 'package:freezed_annotation/freezed_annotation.dart';

part 'update_intro_request_model.freezed.dart';
part 'update_intro_request_model.g.dart';

@freezed
abstract class UpdateIntroRequestModel with _$UpdateIntroRequestModel {
  const factory UpdateIntroRequestModel({
    String? oneLiner,
    String? role,
    String? experience,
  }) = _UpdateIntroRequestModel;

  factory UpdateIntroRequestModel.fromJson(Map<String, dynamic> json) =>
      _$UpdateIntroRequestModelFromJson(json);
}
