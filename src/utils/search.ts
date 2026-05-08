export const normalizeSearch = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

export const matchSearch = (
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    return true;
  }

  return fields.some((field) => normalizeSearch(String(field ?? '')).includes(normalizedQuery));
};
