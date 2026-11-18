import 'package:freezed_annotation/freezed_annotation.dart';

part 'send_message_request_model.freezed.dart';
part 'send_message_request_model.g.dart';

@freezed
abstract class SendMessageRequestModel with _$SendMessageRequestModel {
  const factory SendMessageRequestModel({required String content}) =
      _SendMessageRequestModel;

  factory SendMessageRequestModel.fromJson(Map<String, dynamic> json) =>
      _$SendMessageRequestModelFromJson(json);
}
