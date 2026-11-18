import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/team/domain/entities/team_entity.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:material_ui/material_ui.dart';

class TeamTile extends StatelessWidget {
  const TeamTile({super.key, required this.team, this.onTap});
  final TeamCard team;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = team;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      t.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Chip2(
                    '${t.memberCount}/${t.capacity}',
                    color: t.openCount > 0 ? Palette.primary : Palette.textMuted,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                t.contest.title,
                style: const TextStyle(color: Palette.textSub, fontSize: 13),
              ),
              if (t.openRoles.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final r in t.openRoles.where((r) => (r.open ?? 0) > 0))
                      Chip2(
                        '${r.name} ${r.open}',
                        color: Palette.accent,
                        bg: Palette.accentSoft,
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Row(
                children: [
                  Avatar(name: t.leader.name, picture: t.leader.picture, size: 22),
                  const SizedBox(width: 6),
                  Text(
                    '${t.leader.name}${t.leader.school == null ? '' : ' · ${t.leader.school!.shortName}'}',
                    style: const TextStyle(fontSize: 12, color: Palette.textSub),
                  ),
                  const Spacer(),
                  Icon(
                    t.isLiked ? Icons.favorite : Icons.favorite_border,
                    size: 16,
                    color: t.isLiked ? Palette.danger : Palette.textMuted,
                  ),
                  Text(' ${t.likeCount}', style: const TextStyle(fontSize: 12)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
