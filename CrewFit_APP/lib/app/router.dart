import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/router.gr.dart';

/// 인증 분기: CrewFitApp 의 AuthBloc 리스너(routeByAuth)가 담당
@AutoRouterConfig(replaceInRouteName: 'Page,Route')
class AppRouter extends RootStackRouter {
  @override
  RouteType get defaultRouteType => const RouteType.material();

  @override
  List<AutoRoute> get routes => [
    AutoRoute(path: '/', page: SplashRoute.page, initial: true),
    AutoRoute(path: '/login', page: LoginRoute.page),
    AutoRoute(
      path: '/main',
      page: MainRoute.page,
      children: [
        AutoRoute(path: '', page: HomeRoute.page),
        AutoRoute(path: 'chat', page: ChatListRoute.page),
        AutoRoute(path: 'me', page: MeRoute.page),
      ],
    ),
    AutoRoute(path: '/contest', page: ContestDetailRoute.page),
    AutoRoute(path: '/create-team', page: CreateTeamRoute.page),
    AutoRoute(path: '/team', page: TeamPreviewRoute.page),
    AutoRoute(path: '/room', page: ChatRoomRoute.page),
    AutoRoute(path: '/submission', page: SubmissionRoute.page),
    AutoRoute(path: '/invitations', page: InvitationsRoute.page),
    AutoRoute(path: '/intro', page: IntroEditRoute.page),
    AutoRoute(path: '/interested', page: InterestedUsersRoute.page),
    AutoRoute(path: '/profile', page: ProfileRoute.page),
  ];
}
