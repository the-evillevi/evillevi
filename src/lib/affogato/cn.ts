/* Local copy of the site's cn() — Affogato imports stay inside the
 * affogato boundary so the app can be extracted into a standalone app. */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
