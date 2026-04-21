export type WeekDay = {
  day: number;
  date: Date;
  shortLabel: string;
  longLabel: string;
  dayOfMonth: number;
};

const SHORT_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LONG_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const getCurrentWeekDays = (reference: Date = new Date()): WeekDay[] => {
  const base = new Date(reference);
  base.setHours(0, 0, 0, 0);

  const jsDay = base.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  const monday = new Date(base);
  monday.setDate(base.getDate() - (isoDay - 1));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      day: i + 1,
      date,
      shortLabel: SHORT_LABELS[i],
      longLabel: LONG_LABELS[i],
      dayOfMonth: date.getDate(),
    };
  });
};

export const getDayLongLabel = (day: number): string => LONG_LABELS[day - 1] ?? "";
