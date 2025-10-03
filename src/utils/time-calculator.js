export function calculateTotalMinutes(activities) {
  return activities.reduce((total, activity) => {
    const minutes = parseInt(activity.minuti || 0);
    const people = parseInt(activity.persone || 1);
    const multiplier = parseFloat(activity.moltiplicatore || 1);
    return total + (minutes * people * multiplier);
  }, 0);
}

export function minutesToHours(minutes) {
  return (minutes / 60).toFixed(2);
}

export function formatDecimalHours(hours) {
  return parseFloat(hours).toFixed(2);
}

export function hoursToMinutes(hours) {
  return Math.round(hours * 60);
}

export function formatMinutesToHoursString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function parseTimeString(timeString) {
  const match = timeString.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}
