import 'package:crewfit/app/modules/common/presentation/bloc/load_state.dart';
import 'package:crewfit/app/modules/common/presentation/utils/error_message.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

export 'load_state.dart';

/// 조회 + 액션 후 새로고침 공통 Cubit
abstract class LoadCubit<T> extends Cubit<LoadState<T>> {
  LoadCubit() : super(LoadState<T>.loading());

  Future<T> fetch();

  T? get data => switch (state) {
    LoadLoaded(:final data) => data,
    _ => null,
  };

  Future<void> load({bool silent = false}) async {
    if (!silent || data == null) emit(LoadState<T>.loading());
    try {
      final result = await fetch();
      if (!isClosed) emit(LoadState<T>.loaded(result));
    } catch (e) {
      if (!isClosed) emit(LoadState<T>.failure(errorMessage(e)));
    }
  }

  /// 실패 시 메시지 반환, 성공 시 null
  Future<String?> run(Future<void> Function() action) async {
    try {
      await action();
      await load(silent: true);
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }
}
