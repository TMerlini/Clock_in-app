import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
