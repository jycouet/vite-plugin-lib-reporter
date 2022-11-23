export function formatSize(number: number): string {
  return (number / 1024).toFixed(2) + " kb";
}
