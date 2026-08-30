// Pure helpers for Odoo-style filter / sort / group over an in-memory list of records.
// A "field" descriptor looks like:
//   { key: 'status', label: 'Status', type: 'select', options: [{value,label}], getValue?: (row) => any }
// Supported types: 'text' | 'number' | 'date' | 'select' | 'boolean'

const toComparable = (value) => {
  if (value == null) return null;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return String(value).toLowerCase();
};

export const getFieldValue = (row, field) => {
  if (field.getValue) return field.getValue(row);
  return field.key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), row);
};

export const OPERATORS_BY_TYPE = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'is_empty', label: 'is empty' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
  ],
  date: [
    { value: 'on', label: 'is on' },
    { value: 'after', label: 'is after' },
    { value: 'before', label: 'is before' },
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  boolean: [
    { value: 'equals', label: 'is' },
  ],
};

const matchesFilter = (row, filter, fields) => {
  const field = fields.find((f) => f.key === filter.field);
  if (!field) return true;
  const raw = getFieldValue(row, field);

  switch (field.type) {
    case 'text': {
      const v = (raw ?? '').toString().toLowerCase();
      const target = (filter.value ?? '').toLowerCase();
      if (filter.operator === 'is_empty') return !v;
      if (filter.operator === 'equals') return v === target;
      if (filter.operator === 'not_equals') return v !== target;
      return v.includes(target);
    }
    case 'number': {
      const v = Number(raw ?? 0);
      const target = Number(filter.value ?? 0);
      if (filter.operator === 'gt') return v > target;
      if (filter.operator === 'lt') return v < target;
      if (filter.operator === 'gte') return v >= target;
      if (filter.operator === 'lte') return v <= target;
      return v === target;
    }
    case 'date': {
      const ts = toComparable(raw);
      if (ts == null || !filter.value) return false;
      const target = new Date(filter.value).setHours(0, 0, 0, 0);
      const rowDay = new Date(ts).setHours(0, 0, 0, 0);
      if (filter.operator === 'after') return rowDay > target;
      if (filter.operator === 'before') return rowDay < target;
      return rowDay === target;
    }
    case 'boolean': {
      const v = Boolean(raw);
      return v === (filter.value === 'true' || filter.value === true);
    }
    case 'select':
    default: {
      const v = String(raw ?? '');
      if (filter.operator === 'not_equals') return v !== filter.value;
      return v === filter.value;
    }
  }
};

export const applyFilters = (data, filters, fields) => {
  if (!filters?.length) return data;
  return data.filter((row) => filters.every((f) => matchesFilter(row, f, fields)));
};

export const sortItems = (data, sortBy, sortDir, fields) => {
  if (!sortBy) return data;
  const field = fields.find((f) => f.key === sortBy);
  if (!field) return data;
  const dir = sortDir === 'desc' ? -1 : 1;

  return [...data].sort((a, b) => {
    const va = toComparable(getFieldValue(a, field));
    const vb = toComparable(getFieldValue(b, field));
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
};

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const groupItems = (data, groupBy, fields) => {
  if (!groupBy) return null;
  const field = fields.find((f) => f.key === groupBy);
  if (!field) return null;

  // Group dates by calendar day, not exact timestamp, so same-day records land in one group.
  const dayKeyFor = (raw) => {
    const ts = toComparable(raw);
    if (ts == null) return null;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const labelFor = (raw) => {
    if (field.type === 'date') {
      const dayTs = dayKeyFor(raw);
      return dayTs == null ? 'None' : DATE_LABEL_FORMATTER.format(new Date(dayTs));
    }
    if (field.type === 'select' && field.options) {
      return field.options.find((o) => o.value === String(raw))?.label ?? (raw || 'None');
    }
    if (field.type === 'boolean') return raw ? 'Yes' : 'No';
    if (raw == null || raw === '') return 'None';
    return String(raw);
  };

  const map = new Map();
  for (const row of data) {
    const raw = getFieldValue(row, field);
    let key;
    if (field.type === 'date') {
      const dayTs = dayKeyFor(raw);
      key = dayTs == null ? '__none__' : String(dayTs);
    } else {
      key = raw == null || raw === '' ? '__none__' : String(raw);
    }
    if (!map.has(key)) map.set(key, { key, label: labelFor(raw), items: [] });
    map.get(key).items.push(row);
  }

  const groups = Array.from(map.values());
  if (field.type === 'date') {
    groups.sort((a, b) => {
      if (a.key === '__none__') return 1;
      if (b.key === '__none__') return -1;
      return Number(a.key) - Number(b.key);
    });
  }
  return groups;
};

/** Runs filters -> sort -> group in one call. Returns { flat, groups } where groups is null if no groupBy. */
export const applyListControls = (data, { filters = [], sortBy, sortDir = 'asc', groupBy } = {}, fields) => {
  const filtered = applyFilters(data, filters, fields);
  const sorted = sortItems(filtered, sortBy, sortDir, fields);
  const groups = groupBy ? groupItems(sorted, groupBy, fields) : null;
  return { flat: sorted, groups };
};
