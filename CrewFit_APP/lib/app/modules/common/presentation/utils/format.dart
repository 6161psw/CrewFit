import 'package:intl/intl.dart';

String dDayLabel(int d) => d > 0 ? 'D-$d' : (d == 0 ? 'D-DAY' : '마감');

String dateLabel(DateTime? t) =>
    t == null ? '-' : DateFormat('M/d (E)', 'ko').format(t.toLocal());

String timeLabel(DateTime t) => DateFormat('HH:mm').format(t.toLocal());
