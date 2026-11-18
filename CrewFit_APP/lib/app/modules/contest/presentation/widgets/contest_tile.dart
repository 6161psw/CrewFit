import 'package:crewfit/app/modules/common/presentation/utils/format.dart';
import 'package:crewfit/app/modules/common/presentation/widgets/ui.dart';
import 'package:crewfit/app/modules/contest/domain/entities/contest_entity.dart';
import 'package:crewfit/app/values/palette.dart';
import 'package:material_ui/material_ui.dart';

class ContestTile extends StatelessWidget {
  const ContestTile({super.key, required this.contest, this.onTap});
  final ContestCard contest;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = contest;
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
                  Chip2(
                    dDayLabel(c.dDay),
                    color: c.dDay <= 7 ? Palette.danger : Palette.primary,
                  ),
                  const SizedBox(width: 6),
                  if (c.categoryLabel.isNotEmpty)
                    Chip2(c.categoryLabel, color: Palette.textSub),
                  const Spacer(),
                  Icon(
                    c.isInterested ? Icons.favorite : Icons.favorite_border,
                    size: 18,
                    color: c.isInterested ? Palette.danger : Palette.textMuted,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                c.title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                '${c.organizer} · ${c.minTeamSize}~${c.maxTeamSize}인 · 모집 팀 ${c.recruitingTeamCount}',
                style: const TextStyle(color: Palette.textSub, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
