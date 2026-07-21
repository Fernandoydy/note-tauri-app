export function normalizeTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  const seen = new Set<string>();

  return tags.filter((tag) => {
    const key = tag.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
