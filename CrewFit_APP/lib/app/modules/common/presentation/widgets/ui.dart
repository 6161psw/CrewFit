import 'package:crewfit/app/modules/common/presentation/bloc/load_state.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:material_ui/material_ui.dart';

/// LoadState → 로딩/에러/본문
class LoadView<T> extends StatelessWidget {
  const LoadView({
    super.key,
    required this.state,
    required this.builder,
    this.onRetry,
  });

  final LoadState<T> state;
  final Widget Function(T data) builder;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => switch (state) {
    LoadLoading() => const Center(child: CircularProgressIndicator()),
    LoadFailure(:final message) => EmptyView(
      message,
      action: onRetry == null
          ? null
          : TextButton(onPressed: onRetry, child: const Text('다시 시도')),
    ),
    LoadLoaded(:final data) => builder(data),
  };
}

class EmptyView extends StatelessWidget {
  const EmptyView(this.message, {super.key, this.action});
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Palette.textSub),
          ),
          ?action,
        ],
      ),
    ),
  );
}

class Chip2 extends StatelessWidget {
  const Chip2(this.label, {super.key, this.color = Palette.primary, this.bg});
  final String label;
  final Color color;
  final Color? bg;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: bg ?? color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(
      label,
      style: TextStyle(
        color: color,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        ?trailing,
      ],
    ),
  );
}

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.name, this.picture, this.size = 36});
  final String name;
  final String? picture;
  final double size;

  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: size / 2,
    backgroundColor: Palette.primarySoft,
    foregroundImage: picture == null ? null : NetworkImage(picture!),
    child: Text(
      name.isEmpty ? '?' : name.characters.first,
      style: const TextStyle(color: Palette.primary),
    ),
  );
}

extension SnackX on BuildContext {
  void toast(String message) => ScaffoldMessenger.of(this)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
