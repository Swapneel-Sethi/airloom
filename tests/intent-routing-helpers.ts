export function matchIntentForTest(normalized: string): { name: string } | null {
  const words = normalized.split(/\s+/);
  const hasChild = words.includes("child") || words.includes("kid") || words.includes("kids") || words.includes("son") || words.includes("daughter") || words.includes("baby") || words.includes("toddler") || words.includes("infant");
  const hasActivity = /\b(run|jog|exercise|walk|walking|cycle|cycling|gym|cricket|sport|session|workout|play|playing|outside|outdoor)\b/.test(normalized);
  const hasTime = /\b(morning|afternoon|evening|tonight|night)\b/.test(normalized);

  // Child + activity + time → outdoor activity (most specific, beats family)
  if (hasChild && hasActivity && hasTime) {
    return { name: "outdoor-activity" };
  }
  // Activity + time (no child) → outdoor activity
  if (hasActivity && hasTime) {
    return { name: "outdoor-activity" };
  }

  const patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: "purifier", pattern: /\b(purifier|filter|air cleaner|hepa)\b/ },
    { name: "indoor-windows", pattern: /\b(window|ventilate|open|fresh air|air out)\b/ },
    { name: "commute", pattern: /\b(commute|travel|leave|office|work|bus|metro|train|cab|scooter|trip|ride|drive|transport|cycle|compare)\b/ },
    { name: "family", pattern: /\b(family|child|kid|school|parent|mother|baby|infant|toddler|older adult|elderly|grandparent)\b/ },
    { name: "activity", pattern: /\b(run|jog|exercise|walk|walking|cycl|gym|cricket|sport|session|workout)\b/ },
    { name: "swaps", pattern: /\b(swap|swaps|sustain|carbon|co2|emission|impact|change mode|reduce emission)\b/ },
  ];
  for (const p of patterns) {
    if (p.pattern.test(normalized)) return p;
  }
  return null;
}