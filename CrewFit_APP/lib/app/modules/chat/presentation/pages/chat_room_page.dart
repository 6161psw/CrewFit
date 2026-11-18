import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/modules/chat/domain/entities/chat_message_entity.dart';
import 'package:crewfit/app/modules/chat/presentation/bloc/chat_room_cubit.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/utils/format.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/team/presentation/bloc/team_cubits.dart';
import 'package:crewfit/app/router.gr.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

@RoutePage()
class ChatRoomPage extends StatelessWidget {
  const ChatRoomPage({super.key, required this.teamId, required this.teamName});
  final int teamId;
  final String teamName;

  @override
  Widget build(BuildContext context) => MultiBlocProvider(
    providers: [
      BlocProvider(create: (_) => sl<ChatRoomCubit>()..open(teamId)),
      BlocProvider(create: (_) => sl<TeamDetailCubit>()..open(teamId)),
    ],
    child: _View(teamName),
  );
}

class _View extends StatelessWidget {
  const _View(this.teamName);
  final String teamName;

  @override
  Widget build(BuildContext context) {
    final team = context.watch<TeamDetailCubit>();
    final t = team.data;
    final showSubmission = t != null && (t.submission != null || t.status != TeamStatus.recruiting);

    return Scaffold(
      appBar: AppBar(
        title: Text(t?.name ?? teamName),
        actions: [
          if (showSubmission)
            TextButton(
              onPressed: () => context.router.push(SubmissionRoute(teamId: t!.id)),
              child: const Text('제출 서류'),
            ),
          PopupMenuButton<String>(
            onSelected: (v) => _menu(context, v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'info', child: Text('팀 정보')),
              if (t?.me.isLeader == true && t?.status == TeamStatus.recruiting)
                const PopupMenuItem(value: 'confirm', child: Text('팀 확정 (모집 마감)')),
              if (t?.me.isLeader == false)
                const PopupMenuItem(value: 'leave', child: Text('팀 나가기')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          const Expanded(child: _Messages()),
          const _Input(),
        ],
      ),
    );
  }

  Future<void> _menu(BuildContext context, String v) async {
    final team = context.read<TeamDetailCubit>();
    switch (v) {
      case 'info':
        await context.router.push(TeamPreviewRoute(teamId: team.id));
      case 'confirm':
        final ok = await _ask(context, '팀을 확정할까요? 모집이 마감되고 제출 준비가 시작돼요.');
        if (!ok) return;
        final err = await team.confirm();
        if (context.mounted) context.toast(err ?? '팀 확정 완료');
      case 'leave':
        final ok = await _ask(context, '팀을 나갈까요?');
        if (!ok) return;
        final err = await team.leave();
        if (!context.mounted) return;
        if (err != null) return context.toast(err);
        context.router.maybePop();
    }
  }

  Future<bool> _ask(BuildContext context, String message) async =>
      await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          content: Text(message),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('취소')),
            FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('확인')),
          ],
        ),
      ) ??
      false;
}

class _Messages extends StatelessWidget {
  const _Messages();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ChatRoomCubit>().state;
    final auth = context.watch<AuthBloc>().state;
    final myId = auth is Authenticated ? auth.me.id : null;
    if (state.loading) return const Center(child: CircularProgressIndicator());
    if (state.error != null) return EmptyView(state.error!);
    if (state.messages.isEmpty) return const EmptyView('첫 메시지를 보내보세요');
    final list = state.messages.reversed.toList();
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.all(12),
      itemCount: list.length,
      itemBuilder: (_, i) => _Bubble(list[i], mine: list[i].sender?.id == myId),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble(this.m, {required this.mine});
  final ChatMessageEntity m;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    if (m.type == MessageType.system) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Center(
          child: Chip2(m.content, color: Palette.textSub, bg: Palette.border),
        ),
      );
    }
    final bubble = Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: mine ? Palette.primary : Palette.white,
        borderRadius: BorderRadius.circular(14),
        border: mine ? null : Border.all(color: Palette.border),
      ),
      child: Text(m.content, style: TextStyle(color: mine ? Palette.white : Palette.text)),
    );
    final time = Text(
      timeLabel(m.createdAt),
      style: const TextStyle(fontSize: 10, color: Palette.textMuted),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!mine && m.sender != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(m.sender!.name, style: const TextStyle(fontSize: 12, color: Palette.textSub)),
            ),
          Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: mine
                ? [time, const SizedBox(width: 4), bubble]
                : [bubble, const SizedBox(width: 4), time],
          ),
        ],
      ),
    );
  }
}

class _Input extends StatefulWidget {
  const _Input();

  @override
  State<_Input> createState() => _InputState();
}

class _InputState extends State<_Input> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _text.text;
    _text.clear();
    final err = await context.read<ChatRoomCubit>().send(text);
    if (err != null && mounted) {
      _text.text = text;
      context.toast(err);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sending = context.select((ChatRoomCubit c) => c.state.sending);
    return SafeArea(
      top: false,
      child: Container(
        color: Palette.white,
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _text,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(
                  hintText: '메시지 입력',
                  isDense: true,
                ),
              ),
            ),
            IconButton(
              onPressed: sending ? null : _send,
              icon: const Icon(Icons.send, color: Palette.primary),
            ),
          ],
        ),
      ),
    );
  }
}
