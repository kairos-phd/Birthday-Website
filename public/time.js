export function countdown(target, now = Date.now()) {
  const end = Date.parse(target);
  if (!Number.isFinite(end)) return null;
  const seconds = Math.max(0, Math.floor((end - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    reached: now >= end
  };
}

export function daysTogether(start, end = '', now = new Date(), timeZone = 'Asia/Ho_Chi_Minh') {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
  const part = type => parts.find(value => value.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return Math.max(0, Math.round((Date.parse(end || today) - Date.parse(start)) / 86400000));
}
