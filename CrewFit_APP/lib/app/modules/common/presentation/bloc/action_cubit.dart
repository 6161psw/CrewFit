import 'package:crewfit/app/modules/common/presentation/utils/error_message.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

/// 단발 액션(생성·수정) 진행 여부. state = busy
@injectable
class ActionCubit extends Cubit<bool> {
  ActionCubit() : super(false);

  /// (결과, 에러메시지)
  Future<(T?, String?)> run<T>(Future<T> Function() action) async {
    if (state) return (null, null);
    emit(true);
    try {
      return (await action(), null);
    } catch (e) {
      return (null, errorMessage(e));
    } finally {
      if (!isClosed) emit(false);
    }
  }
}
