import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getLocationOptions } from '../../services/locations';

/**
 * STRICT LocationSelect
 * - Główne pole jest readOnly (nie pozwala wpisać własnej wartości)
 * - Dropdown z polem szukania 1+ znak, wyniki z /dictionaries/locations/options
 * - Wartość można ustawić TYLKO wybierając opcję z listy
 */
export default function LocationSelect({
  value,
  onChange,
  required,
  disabled,
  autoFocus,
  style,
  className,
  placeholder = 'Wybierz lokalizację…',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const searchRef = useRef(null);
  const debTimer = useRef(null);

  // --------- Close on outside click ----------
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // --------- Fetch options (debounced) ----------
  useEffect(() => {
    if (!open) return;
    if (debTimer.current) clearTimeout(debTimer.current);

    debTimer.current = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 1) { setOptions([]); return; } // ← 1 znak
      try {
        setLoading(true);
        const opts = await getLocationOptions(q, 20); // [{id,label}]
        setOptions(opts || []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debTimer.current);
  }, [open, query]);

  // --------- Open & focus search ----------
  const openDropdown = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }, [disabled]);

  // --------- Select option ----------
  const selectValue = useCallback((label) => {
    onChange?.(label);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  const onSearchKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className="location-select-container" style={{ position: 'relative', ...style }}>
      {/* Główne pole – readOnly */}
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        onClick={openDropdown}
        onFocus={openDropdown}
        autoFocus={autoFocus}
        className={className}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        required={required}
      />

      {/* Dropdown */}
      {open && (
        <div
          className="location-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            zIndex: 1000,
            boxShadow: '0 8px 16px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Szukaj (min. 1 znak)…"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6
              }}
            />
          </div>

          {loading && (
            <div style={{ padding: 10, color: '#666' }}>Szukanie…</div>
          )}

          {!loading && query.trim().length < 1 && (
            <div style={{ padding: 10, color: '#6b7280' }}>
              Wpisz co najmniej 1 znak.
            </div>
          )}

          {!loading && query.trim().length >= 1 && options.length === 0 && (
            <div style={{ padding: 10, color: '#6b7280' }}>
              Brak wyników dla „{query.trim()}”.
            </div>
          )}

          {!loading && options.map(opt => (
            <div
              key={opt.id}
              onMouseDown={(e) => { e.preventDefault(); selectValue(opt.label); }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
              title={opt.label}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
