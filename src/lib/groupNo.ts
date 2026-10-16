/** "01", "02", ...: a skill group's number, shared by its cylinder, its tree entry and its parts list. */
export const groupNo = (index: number): string => String(index + 1).padStart(2, '0');
