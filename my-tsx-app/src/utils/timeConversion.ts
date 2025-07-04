import { DateTime } from 'luxon';

/**
 * Converts Modified Julian Date (MJD) to Luxon DateTime
 * MJD epoch starts at midnight on November 17, 1858
 */
export const mjdToDateTime = (mjd: number): DateTime => {
  // Convert MJD directly to Unix timestamp (milliseconds)
  const unixTimestamp = mjd * 86400000; // Convert days to milliseconds
  return DateTime.fromMillis(unixTimestamp)
    .plus({ years: 30, hours: 14 }); // Add 30 years and 14 hours
};

/**
 * Converts Luxon DateTime to Modified Julian Date (MJD)
 */
export const dateTimeToMJD = (dt: DateTime): number => {
  const adjustedDateTime = dt.minus({ years: 30, hours: 14 }); // Subtract 30 years and 14 hours
  const unixTimestamp = adjustedDateTime.toMillis();
  return unixTimestamp / 86400000; // Convert milliseconds to days
};

/**
 * Formats a DateTime object into a human-readable string
 * Example output: "July 20, 2024 15:30:45 EDT"
 */
export const formatDateTime = (dt: DateTime): string => {
  return dt.toLocaleString({
    ...DateTime.DATETIME_FULL,
    hour12: false // Use 24-hour format
  });
};

/**
 * Formats a DateTime object into a short format
 * Example output: "2024-07-20 15:30"
 */
export const formatDateTimeShort = (dt: DateTime): string => {
  return dt.toLocaleString({
    ...DateTime.DATETIME_SHORT,
    hour12: false
  });
};

/**
 * Converts MJD directly to a formatted string
 */
export const mjdToFormattedString = (mjd: number, short: boolean = false): string => {
  const dt = mjdToDateTime(mjd);
  return short ? formatDateTimeShort(dt) : formatDateTime(dt);
};

/**
 * Gets current time as MJD
 */
export const getCurrentMJD = (): number => {
  return dateTimeToMJD(DateTime.now());
};

/**
 * Validates if a DateTime is valid
 */
export const isValidDateTime = (dt: DateTime): boolean => {
  return dt.isValid;
}; 