import 'package:crewfit/app/values/env.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('env 기본값', () {
    expect(Env.apiUrl, isNotEmpty);
  });
}
