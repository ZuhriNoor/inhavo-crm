// Odoo-style Filter / Group By / Sort bar for list pages.
// `fields` describes the columns that can be filtered/sorted/grouped — see src/utils/listControls.js
import { useState, useRef, useEffect } from 'react';
import { ListFilter, ArrowUpDown, Layers, X, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { OPERATORS_BY_TYPE } from '../../utils/listControls';

const btnClass = (active) =>
  `flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
    active
      ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
  }`;

const inputClass =
  'px-2 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30';

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);
  return [open, setOpen, ref];
}

function FilterValueInput({ field, operator, value, onChange }) {
  if (operator === 'is_empty') return null;
  if (field.type === 'select') {
    return (
      <select className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'boolean') {
    return (
      <select className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field.type === 'date') {
    return <input type="date" className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === 'number') {
    return <input type="number" className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input type="text" className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
}

/**
 * props:
 *  fields: [{key,label,type,options?}]
 *  value: { filters: [{field,operator,value}], sortBy, sortDir, groupBy }
 *  onChange: (nextValue) => void
 */
export default function ListControlsBar({ fields, value, onChange }) {
  const { filters = [], sortBy = '', sortDir = 'asc', groupBy = '' } = value || {};

  const [filterOpen, setFilterOpen, filterRef] = usePopover();
  const [sortOpen, setSortOpen, sortRef] = usePopover();
  const [groupOpen, setGroupOpen, groupRef] = usePopover();

  const [draftField, setDraftField] = useState(fields[0]?.key || '');
  const draftFieldMeta = fields.find((f) => f.key === draftField) || fields[0];
  const [draftOperator, setDraftOperator] = useState(OPERATORS_BY_TYPE[draftFieldMeta?.type]?.[0]?.value || 'contains');
  const [draftValue, setDraftValue] = useState('');

  useEffect(() => {
    const ops = OPERATORS_BY_TYPE[draftFieldMeta?.type] || [];
    setDraftOperator(ops[0]?.value || 'contains');
    setDraftValue('');
  }, [draftField]);

  const addFilter = () => {
    if (draftOperator !== 'is_empty' && !draftValue && draftValue !== '0' && draftValue !== false) return;
    onChange({
      ...value,
      filters: [...filters, { field: draftField, operator: draftOperator, value: draftValue }],
    });
    setDraftValue('');
  };

  const removeFilter = (idx) => {
    onChange({ ...value, filters: filters.filter((_, i) => i !== idx) });
  };

  const fieldLabel = (key) => fields.find((f) => f.key === key)?.label || key;
  const operatorLabel = (fieldKey, opValue) => {
    const type = fields.find((f) => f.key === fieldKey)?.type;
    return OPERATORS_BY_TYPE[type]?.find((o) => o.value === opValue)?.label || opValue;
  };
  const filterValueLabel = (f) => {
    const field = fields.find((ff) => ff.key === f.field);
    if (field?.type === 'select') return field.options?.find((o) => o.value === f.value)?.label ?? f.value;
    if (field?.type === 'boolean') return f.value === 'true' ? 'Yes' : 'No';
    return f.value;
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      {/* Filters */}
      <div className="relative" ref={filterRef}>
        <button type="button" onClick={() => setFilterOpen((o) => !o)} className={btnClass(filters.length > 0)}>
          <ListFilter size={14} /> Filters {filters.length > 0 && `(${filters.length})`}
        </button>
        {filterOpen && (
          <div className="absolute z-20 mt-1.5 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <select className={`${inputClass} flex-1 min-w-0`} value={draftField} onChange={(e) => setDraftField(e.target.value)}>
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <select className={`${inputClass} flex-1 min-w-0`} value={draftOperator} onChange={(e) => setDraftOperator(e.target.value)}>
                {(OPERATORS_BY_TYPE[draftFieldMeta?.type] || []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <FilterValueInput field={draftFieldMeta} operator={draftOperator} value={draftValue} onChange={setDraftValue} />
            <button
              type="button"
              onClick={addFilter}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-white rounded-md"
              style={{ background: '#875a7b' }}
            >
              <Plus size={13} /> Add Filter
            </button>
          </div>
        )}
      </div>

      {/* Active filter pills */}
      {filters.map((f, idx) => (
        <span
          key={idx}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900"
        >
          {fieldLabel(f.field)} {operatorLabel(f.field, f.operator)} {f.operator !== 'is_empty' && `"${filterValueLabel(f)}"`}
          <button type="button" onClick={() => removeFilter(idx)} className="hover:text-purple-900 dark:hover:text-purple-100">
            <X size={12} />
          </button>
        </span>
      ))}

      {/* Group By */}
      <div className="relative" ref={groupRef}>
        <button type="button" onClick={() => setGroupOpen((o) => !o)} className={btnClass(!!groupBy)}>
          <Layers size={14} /> {groupBy ? `Group: ${fieldLabel(groupBy)}` : 'Group By'}
        </button>
        {groupOpen && (
          <div className="absolute z-20 mt-1.5 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1">
            <button
              type="button"
              onClick={() => { onChange({ ...value, groupBy: '' }); setGroupOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              None
            </button>
            {fields.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => { onChange({ ...value, groupBy: f.key }); setGroupOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-slate-700 ${
                  groupBy === f.key ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-600 dark:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="relative" ref={sortRef}>
        <button type="button" onClick={() => setSortOpen((o) => !o)} className={btnClass(!!sortBy)}>
          <ArrowUpDown size={14} /> {sortBy ? `Sort: ${fieldLabel(sortBy)}` : 'Sort By'}
        </button>
        {sortOpen && (
          <div className="absolute z-20 mt-1.5 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1">
            {fields.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => { onChange({ ...value, sortBy: f.key }); }}
                className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-slate-700 ${
                  sortBy === f.key ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-600 dark:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
            {sortBy && (
              <div className="flex border-t border-gray-100 dark:border-slate-700 mt-1 pt-1 px-2 gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, sortDir: 'asc' })}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded ${sortDir === 'asc' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  <ArrowUp size={12} /> Asc
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, sortDir: 'desc' })}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded ${sortDir === 'desc' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  <ArrowDown size={12} /> Desc
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
