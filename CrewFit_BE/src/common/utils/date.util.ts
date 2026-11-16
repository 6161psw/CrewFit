const DAY = 86_400_000;

/** 서버 TZ(Asia/Seoul) 기준 오늘 0시 */
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const dDay = (date: Date) => Math.ceil((date.getTime() - startOfToday().getTime()) / DAY);

export const daysAgo = (n: number) => new Date(startOfToday().getTime() - n * DAY);
