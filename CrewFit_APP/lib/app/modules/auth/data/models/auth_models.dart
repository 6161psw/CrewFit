import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_models.freezed.dart';
part 'auth_models.g.dart';

@freezed
abstract class TokensModel with _$TokensModel {
  const factory TokensModel({
    required String accessToken,
    required String refreshToken,
  }) = _TokensModel;

  factory TokensModel.fromJson(Map<String, dynamic> json) =>
      _$TokensModelFromJson(json);
}

@freezed
abstract class IdTokenRequestModel with _$IdTokenRequestModel {
  const factory IdTokenRequestModel({required String idToken}) =
      _IdTokenRequestModel;

  factory IdTokenRequestModel.fromJson(Map<String, dynamic> json) =>
      _$IdTokenRequestModelFromJson(json);
}

@freezed
abstract class RefreshRequestModel with _$RefreshRequestModel {
  const factory RefreshRequestModel({required String refreshToken}) =
      _RefreshRequestModel;

  factory RefreshRequestModel.fromJson(Map<String, dynamic> json) =>
      _$RefreshRequestModelFromJson(json);
}

@freezed
abstract class DevLoginRequestModel with _$DevLoginRequestModel {
  const factory DevLoginRequestModel({required String email, String? name}) =
      _DevLoginRequestModel;

  factory DevLoginRequestModel.fromJson(Map<String, dynamic> json) =>
      _$DevLoginRequestModelFromJson(json);
}
