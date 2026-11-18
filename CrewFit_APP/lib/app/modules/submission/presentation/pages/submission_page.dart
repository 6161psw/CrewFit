import 'package:auto_route/auto_route.dart';
import 'package:crewfit/app/di/locator.dart';
import 'package:crewfit/app/modules/auth/presentation/bloc/auth_bloc.dart';
import 'package:crewfit/app/modules/common/domain/enums/statuses.dart';
import 'package:crewfit/app/modules/common/presentation/utils/format.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/submission/domain/entities/submission_entity.dart';
import 'package:crewfit/app/modules/submission/presentation/bloc/submission_cubit.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:material_ui/material_ui.dart';

/// F-01 제출 서류 (확인·서명·제출). 파일 업로드 = 웹
@RoutePage()
class SubmissionPage extends StatelessWidget {
  const SubmissionPage({super.key, required this.teamId});
  final int teamId;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (_) => sl<SubmissionCubit>()..open(teamId),
    child: const _View(),
  );
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final cubit = context.watch<SubmissionCubit>();
    final auth = context.watch<AuthBloc>().state;
    final myId = auth is Authenticated ? auth.me.id : null;
    return Scaffold(
      appBar: AppBar(title: const Text('제출 서류')),
      body: RefreshIndicator(
        onRefresh: () => cubit.load(silent: true),
        child: LoadView(
          state: cubit.state,
          onRetry: cubit.load,
          builder: (s) => ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              _Summary(s),
              if (s.status == SubmissionStatus.revisionRequested && s.revision != null)
                _RevisionBox(s.revision!),
              SectionTitle('서류 ${s.readyCount}/${s.totalCount}'),
              for (final d in s.documents)
                ListTile(
                  leading: Icon(
                    d.status == 'READY' ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: d.revisionRequested
                        ? Palette.danger
                        : (d.status == 'READY' ? Palette.primary : Palette.textMuted),
                  ),
                  title: Text(d.title),
                  subtitle: Text(
                    [
                      if (d.auto) '자동 생성',
                      if (d.signedCount != null) '서명 ${d.signedCount}/${s.members.length}',
                      if (d.fileName != null) d.fileName!,
                      if (!d.auto && d.fileName == null) '웹에서 파일 업로드',
                      if (d.revisionRequested) '보완 필요',
                    ].join(' · '),
                  ),
                ),
              const SectionTitle('팀원 서명'),
              for (final m in s.members)
                ListTile(
                  dense: true,
                  title: Text('${m.name}${m.isLeader ? ' (팀장)' : ''}'),
                  subtitle: Text([m.role, m.school].whereType<String>().join(' · ')),
                  trailing: Chip2(
                    m.signed ? '서명 완료' : '미서명',
                    color: m.signed ? Palette.primary : Palette.textMuted,
                  ),
                ),
              const SectionTitle('진행 상황'),
              for (final step in s.timeline)
                ListTile(
                  dense: true,
                  leading: Icon(
                    step.done ? Icons.check : Icons.schedule,
                    color: step.revision
                        ? Palette.danger
                        : (step.done ? Palette.primary : Palette.textMuted),
                  ),
                  title: Text(step.label),
                  trailing: Text(step.at == null ? '' : dateLabel(step.at)),
                ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: switch (cubit.data) {
        final s? => _Actions(s, isLeader: s.leader.id == myId),
        null => null,
      },
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary(this.s);
  final SubmissionEntity s;

  @override
  Widget build(BuildContext context) => Container(
    color: Palette.white,
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Chip2(
          s.status.label,
          color: s.status == SubmissionStatus.revisionRequested ? Palette.danger : Palette.primary,
        ),
        const SizedBox(height: 8),
        Text(s.teamName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        Text(s.contest.title, style: const TextStyle(color: Palette.textSub)),
        if (s.contest.submitTo != null) Text('제출처: ${s.contest.submitTo}'),
        if (!s.allSchoolVerified)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('학교 인증 안 된 팀원 있음', style: TextStyle(color: Palette.danger)),
          ),
      ],
    ),
  );
}

class _RevisionBox extends StatelessWidget {
  const _RevisionBox(this.r);
  final Revision r;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.all(16),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Palette.dangerSoft,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '보완 요청${r.deadline == null ? '' : ' · ${dateLabel(r.deadline)}까지'}',
          style: const TextStyle(color: Palette.danger, fontWeight: FontWeight.w700),
        ),
        for (final reason in r.reasons) Text('• ${reason.label}'),
        if (r.message != null) Text(r.message!),
      ],
    ),
  );
}

class _Actions extends StatelessWidget {
  const _Actions(this.s, {required this.isLeader});
  final SubmissionEntity s;
  final bool isLeader;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<SubmissionCubit>();
    final editable = s.status == SubmissionStatus.preparing ||
        s.status == SubmissionStatus.revisionRequested;
    if (!editable) return const SizedBox.shrink();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            if (!s.mySigned)
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    final err = await cubit.sign();
                    if (context.mounted) context.toast(err ?? '서명 완료');
                  },
                  child: const Text('서명하기'),
                ),
              ),
            if (!s.mySigned && isLeader) const SizedBox(width: 8),
            if (isLeader)
              Expanded(
                child: FilledButton(
                  onPressed: s.canSubmit
                      ? () async {
                          final err = await cubit.submit();
                          if (context.mounted) context.toast(err ?? '제출 완료');
                        }
                      : null,
                  child: const Text('제출하기'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
