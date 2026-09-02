// PhoneLink — renders a phone number as a tel: link on mobile so tapping it
// opens the dialer. On desktop it stays plain text (no dialer to hand off to).
import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px), (pointer: coarse)';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
};

const DEFAULT_COUNTRY_CODE = '91';

/**
 * Normalize the many shapes numbers are stored in — "+91 98765 43210",
 * "9876543210", "098765-43210", "0091 98765 43210" — into a single E.164
 * string for the tel: URI. Anything unrecognized is passed through as bare
 * digits rather than guessed at, so the dialer still gets something usable.
 */
const toDialable = (phone) => {
  // A field holding two numbers ("98765 43210 / 91234 56789") — dial the first.
  const first = String(phone).split(/[,;/]|\bor\b|\band\b/i)[0];

  const hasPlus = /^\s*\+/.test(first);
  const digits = first.replace(/\D/g, '');
  if (!digits) return '';

  // Already international, either "+91…" or "0091…"
  if (hasPlus) return '+' + digits;
  if (digits.startsWith('00')) return '+' + digits.slice(2);

  // Country code present without the plus: 12 digits starting 91
  if (digits.length === 2 + 10 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return '+' + digits;
  }
  // Trunk-prefixed local: 011 98765 43210 / 0 98765 43210
  const local = digits.replace(/^0+/, '');
  if (local.length === 10) return `+${DEFAULT_COUNTRY_CODE}${local}`;

  return digits;
};

const PhoneLink = ({ phone, className = '', children }) => {
  const isMobile = useIsMobile();
  if (!phone) return null;

  const label = children ?? phone;
  const dial = toDialable(phone);

  if (!isMobile || !dial) return <span className={className}>{label}</span>;

  return (
    <a
      href={`tel:${dial}`}
      // Cards and table rows navigate on click, and kanban cards drag on
      // pointer-down — keep both from swallowing the tap.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`${className} underline decoration-dotted underline-offset-2`}
    >
      {label}
    </a>
  );
};

export default PhoneLink;
