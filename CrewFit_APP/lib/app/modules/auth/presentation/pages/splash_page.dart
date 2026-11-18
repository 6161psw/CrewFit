import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/crewfit_app.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

@RoutePage()
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    // 리스너 붙기 전에 이미 결정된 경우 대비
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => routeByAuth(context.read<AuthBloc>().state),
    );
  }

  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: Palette.primary,
    body: Center(
      child: Text(
        'CrewFit',
        style: TextStyle(
          color: Palette.white,
          fontSize: 32,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );
}
