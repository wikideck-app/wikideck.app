import type { Formats } from "next-intl";

// formats nommés, utilisables avec format.dateTime(date, "medium") ou dans les messages ICU
export const formats = {
  dateTime: {
    short: { day: "numeric", month: "short" },
    shortYear: { dateStyle: "short" },
    shortTime: { dateStyle: "short", timeStyle: "short" },
    shortSeconds: { dateStyle: "short", timeStyle: "medium" },
    medium: { dateStyle: "medium" },
    mediumTime: { dateStyle: "medium", timeStyle: "short" },
    long: { dateStyle: "long" },
    longTime: { dateStyle: "long", timeStyle: "short" },
    full: { dateStyle: "full", timeStyle: "short" },
    time: { hour: "2-digit", minute: "2-digit" },
    day: { day: "2-digit", month: "short" },
    weekday: { weekday: "long", day: "numeric", month: "long" },
    monthYear: { month: "long", year: "numeric" },
  },
  number: {
    integer: { maximumFractionDigits: 0 },
    decimal1: { maximumFractionDigits: 1 },
    percent: { style: "percent", maximumFractionDigits: 1 },
    percent3: { style: "percent", minimumFractionDigits: 3, maximumFractionDigits: 3 },
    compact: { notation: "compact" },
  },
} satisfies Formats;
