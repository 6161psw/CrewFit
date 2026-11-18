import 'package:crewfit/app/router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

@module
abstract class Module {
  FlutterSecureStorage get flutterSecureStorage => const FlutterSecureStorage();

  @singleton
  AppRouter get appRouter => AppRouter();
}
