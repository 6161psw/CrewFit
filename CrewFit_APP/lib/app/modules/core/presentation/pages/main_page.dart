import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:material_ui/material_ui.dart';

@RoutePage()
class MainPage extends StatelessWidget {
  const MainPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AutoTabsRouter(
      routes: const [HomeRoute(), ChatListRoute(), MeRoute()],
      builder: (context, child) {
        final tabs = AutoTabsRouter.of(context);
        return Scaffold(
          body: child,
          bottomNavigationBar: NavigationBar(
            selectedIndex: tabs.activeIndex,
            onDestinationSelected: tabs.setActiveIndex,
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home_outlined), label: '홈'),
              NavigationDestination(
                icon: Icon(Icons.chat_bubble_outline),
                label: '채팅',
              ),
              NavigationDestination(icon: Icon(Icons.person_outline), label: 'MY'),
            ],
          ),
        );
      },
    );
  }
}
