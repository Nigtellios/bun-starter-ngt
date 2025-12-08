/**
 * Parse a boolean from a string, returning a fallback if the value is undefined.
 * @param value 
 * @param fallback 
 * @returns 
 */
export const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
};

/**
 * Parse an integer from a string, returning a fallback if parsing fails.
 * @param value
 * @param fallback
 * @returns 
 */
export const parseInteger = (value: string | undefined, fallback: number) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
};
