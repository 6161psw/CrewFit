import 'package:crewfit/app/crewfit_app.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app_bloc_observer.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:logging/logging.dart';
import 'package:material_ui/material_ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Logger.root.level = Level.INFO;
  Logger.root.onRecord.listen(
    (r) => debugPrint('[${r.loggerName}] ${r.message} ${r.error ?? ''}'),
  );
  await initializeDateFormatting('ko');
  Bloc.observer = AppBlocObserver();
  await configureDependencies();
  runApp(const CrewFitApp());
}
