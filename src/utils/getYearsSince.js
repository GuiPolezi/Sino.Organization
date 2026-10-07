export const FOUNDING_YEAR = 1989;

export const getYearsSince = (year = FOUNDING_YEAR) =>
  new Date().getFullYear() - year;
