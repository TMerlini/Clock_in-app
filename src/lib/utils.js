import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfYear, endOfYear } from "date-fns"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Converts decimal hours to hours:minutes format
 * @param {number} decimalHours - Hours in decimal format (e.g., 0.5, 2.5)
 * @returns {string} Formatted string in hours:minutes format (e.g., "0:30", "2:30")
 */
export function formatHoursMinutes(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculates total Isenção (unpaid extra) hours used in a calendar year
 * @param {Array} sessions - Array of session objects
 * @param {Date|number} sessionDate - Date or timestamp to determine the calendar year
 * @param {string} excludeSessionId - Optional session ID to exclude from calculation
 * @returns {number} Total Isenção hours used in that calendar year
 */
export function calculateUsedIsencaoHours(sessions, sessionDate, excludeSessionId = null) {
  const date = typeof sessionDate === 'number' ? new Date(sessionDate) : sessionDate;
  const yearStart = startOfYear(date).getTime();
  const yearEnd = endOfYear(date).getTime();

  return sessions
    .filter(s => {
      // Filter by calendar year
      if (s.clockIn < yearStart || s.clockIn > yearEnd) return false;
      // Exclude the current session if provided
      if (excludeSessionId && s.id === excludeSessionId) return false;
      return true;
    })
    .reduce((sum, s) => sum + (s.unpaidExtraHours || 0), 0);
}
