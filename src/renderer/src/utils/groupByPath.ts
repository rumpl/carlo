/**
 * Groups an array of items by their `path` property.
 *
 * @param items - Array of objects that each have a `path: string` field.
 * @returns An array of `[path, items[]]` pairs in insertion order.
 */
export function groupByPath<T extends { path: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.path) ?? [];
    group.push(item);
    groups.set(item.path, group);
  }
  return [...groups.entries()];
}
