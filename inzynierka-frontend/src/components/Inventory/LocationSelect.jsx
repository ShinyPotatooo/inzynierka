import React, { useEffect, useState } from 'react';
import { listLocations } from '../../services/locations';

/**
 * Prosty <select> z lokalizacjami ze słownika (bez możliwości wpisywania ręcznie).
 * value: string (nazwa lokalizacji, np. "A1-01-01")
 */
export default function LocationSelect({
  value,
  onChange,
  required,
  disabled,
  autoFocus,
  style,
  className,
  placeholder = '— wybierz lokalizację —',
  pageSize = 100, // jednorazowo pobieramy do 100 wpisów
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // pobierz pierwszą stronę (do 100 pozycji — UI i tak wyświetla ~kilkadziesiąt)
        const { items } = await listLocations({ page: 1, limit: Math.min(100, pageSize) });
        if (!alive) return;
        setOptions((items || []).map(it => ({ id: it.id, label: it.name })));
      } catch (e) {
        // zostaw pustą listę
        setOptions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [pageSize]);

  const handleChange = (e) => {
    onChange?.(e.target.value || '');
  };

  // jeśli aktualna wartość nie jest w liście, i tak pokaż ją na górze (disabled),
  // aby było widać co siedzi w rekordzie (np. stary wpis spoza słownika)
  const hasValue = value && options.some(o => o.label === value);

  return (
    <select
      value={value && hasValue ? value : ''}
      onChange={handleChange}
      required={required}
      disabled={disabled || loading}
      autoFocus={autoFocus}
      style={style}
      className={className}
    >
      <option value="" disabled>{loading ? 'Ładowanie…' : placeholder}</option>
      {!hasValue && value ? <option value="" disabled>{`(nie w słowniku) ${value}`}</option> : null}
      {options.map(o => (
        <option key={o.id} value={o.label}>{o.label}</option>
      ))}
    </select>
  );
}
