/** A 0–10 score domain zoomed to the data (with a little air), so changes of ~1 point are visible. */
export function scoreDomain(values: (number | null | undefined)[], minSpan = 3) {
  const vs = values.filter((v): v is number => v != null);
  if (!vs.length) return { min: 0, max: 10, step: 2.5 };
  let min = Math.max(0, Math.floor(Math.min(...vs) - 1));
  let max = Math.min(10, Math.ceil(Math.max(...vs) + 1));
  while (max - min < minSpan) {
    if (min > 0) min--;
    if (max - min < minSpan && max < 10) max++;
    if (min === 0 && max === 10) break;
  }
  const span = max - min;
  return { min, max, step: span <= 4 ? 1 : span <= 8 ? 2 : 2.5 };
}
