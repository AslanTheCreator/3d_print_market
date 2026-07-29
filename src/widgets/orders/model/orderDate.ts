const LOCAL_DATE_TIME_PATTERN =
  /^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

export const parseOrderDateTimestamp = (value: string): number | null => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const localDateMatch = LOCAL_DATE_TIME_PATTERN.exec(normalizedValue);

  if (localDateMatch) {
    const [, dayValue, monthValue, yearValue, hourValue, minuteValue, secondValue] =
      localDateMatch;
    const day = Number(dayValue);
    const month = Number(monthValue);
    const year = Number(yearValue);
    const hour = Number(hourValue);
    const minute = Number(minuteValue);
    const second = Number(secondValue ?? "0");
    const parsedDate = new Date(year, month - 1, day, hour, minute, second);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day ||
      parsedDate.getHours() !== hour ||
      parsedDate.getMinutes() !== minute ||
      parsedDate.getSeconds() !== second
    ) {
      return null;
    }

    return parsedDate.getTime();
  }

  const timestamp = Date.parse(normalizedValue);

  return Number.isFinite(timestamp) ? timestamp : null;
};
