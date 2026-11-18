import 'package:freezed_annotation/freezed_annotation.dart';

part 'load_state.freezed.dart';

@freezed
sealed class LoadState<T> with _$LoadState<T> {
  const factory LoadState.loading() = LoadLoading<T>;
  const factory LoadState.loaded(T data) = LoadLoaded<T>;
  const factory LoadState.failure(String message) = LoadFailure<T>;
}
