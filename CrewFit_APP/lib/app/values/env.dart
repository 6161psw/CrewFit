/// flutter run --dart-define-from-file=env.json
abstract class Env {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
  static const googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
  );
  static const devLogin = bool.fromEnvironment('DEV_LOGIN');

  static bool get googleEnabled => googleServerClientId.isNotEmpty;
}
