import { forwardRef, useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isoToDisplay = (iso) => {
  const m = ISO_RE.exec(iso || '');
  if (!m) return '';
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const digitsToIso = (digits) => {
  if (digits.length !== 8) return '';
  const d = digits.slice(0, 2);
  const mo = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${mo}-${d}`;
};

const formatDigits = (digits) => {
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  return digits;
};

const setRef = (ref, node) => {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
};

/**
 * A dd/mm/yyyy date input, independent of browser/OS locale (Chrome on Windows
 * ignores the `lang` attribute and always renders mm/dd/yyyy for en-US system
 * locales, and hiding a native <input type="date">'s text via CSS still leaks
 * the browser's own mm/dd/yyyy focused-segment highlight — not fixable with CSS
 * alone). This is a plain masked text input (digits auto-formatted as you type)
 * paired with a hidden native date input used only to drive the calendar-picker
 * popup via the button. The underlying value is always ISO `yyyy-mm-dd`, same
 * as a native date input, so existing state/onChange contracts don't change.
 *
 * Works both as a controlled input (`value` + `onChange`) and as an
 * uncontrolled react-hook-form field (spread `{...register('x')}`, and pass the
 * live value separately via `displayValue={watch('x')}` so the text stays in sync).
 */
const DateInput = forwardRef(function DateInput(
  { value, displayValue, onChange, onBlur, name, className = '', disabled, ...rest },
  ref
) {
  const effectiveIso = value !== undefined ? value : displayValue;
  const [text, setText] = useState(() => isoToDisplay(effectiveIso));
  const pickerRef = useRef(null);

  useEffect(() => {
    setText(isoToDisplay(effectiveIso));
  }, [effectiveIso]);

  const emitChange = (iso) => {
    onChange?.({ target: { name, value: iso } });
  };

  const handleTextChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    setText(formatDigits(digits));
    if (digits.length === 8) emitChange(digitsToIso(digits));
    else if (digits.length === 0) emitChange('');
  };

  const handleTextBlur = (e) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 8) {
      setText(isoToDisplay(effectiveIso));
    }
    onBlur?.(e);
  };

  const handlePickerChange = (e) => {
    const iso = e.target.value;
    setText(isoToDisplay(iso));
    emitChange(iso);
  };

  const openPicker = () => {
    if (disabled) return;
    const el = pickerRef.current;
    if (el?.showPicker) {
      try {
        el.showPicker();
        return;
      } catch {
        // fall through to focus/click below
      }
    }
    el?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={(node) => setRef(ref, node)}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name={name}
        value={text}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder="dd/mm/yyyy"
        disabled={disabled}
        className={className}
        style={{ paddingRight: '2.25rem' }}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={disabled}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
        aria-label="Open date picker"
      >
        <Calendar size={15} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        value={effectiveIso || ''}
        onChange={handlePickerChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
});

export default DateInput;
