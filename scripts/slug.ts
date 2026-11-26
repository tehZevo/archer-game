/** A file name for a sheet: "Red Snail" -> "red-snail". */
export const slug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
