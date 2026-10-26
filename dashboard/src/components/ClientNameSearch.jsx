import { useEffect, useRef, useState } from 'react';
import api from '../redux/api';

/**
 * Autocomplete for report "Search By Client Name".
 * Uses /search-clients (full downline tree).
 * Suggestions appear only while typing (not on empty click/focus).
 */
const ClientNameSearch = ({
  value = '',
  selectedUserName = '',
  onChange,
  onSelect,
  className = '',
  inputClassName = 'h-[34px] w-full min-w-[200px] rounded border border-gray-300 px-2 py-1 outline-none text-[13px]',
  label = 'Search By Client Name',
  placeholder = 'Select option',
  showLabel = true,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const onOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = (query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = String(query || '').trim();
    if (!q) {
      requestIdRef.current += 1;
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
      return;
    }

    // Show dropdown immediately while typing
    setLoading(true);
    setShowSuggestions(true);

    debounceRef.current = setTimeout(async () => {
      const reqId = ++requestIdRef.current;
      try {
        const res = await api.get(
          `/search-clients?q=${encodeURIComponent(q)}`,
          { withCredentials: true }
        );
        if (reqId !== requestIdRef.current) return;
        const names = [
          ...new Set(
            (res.data?.data || [])
              .map((u) => u?.userName)
              .filter(Boolean)
          ),
        ];
        setSuggestions(names);
        setShowSuggestions(true);
      } catch {
        if (reqId !== requestIdRef.current) return;
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    }, 200);
  };

  const handleInputChange = (next) => {
    onChange?.(next);
    onSelect?.('');
    fetchSuggestions(next);
  };

  const handlePick = (name) => {
    onChange?.(name);
    onSelect?.(name);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative flex flex-col ${className}`} ref={rootRef}>
      {showLabel ? (
        <label className='mb-1 text-[13px] font-bold text-gray-700'>
          {label}
        </label>
      ) : null}
      <input
        type='text'
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          // Only reopen list if user already typed something
          if (String(value || '').trim() && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        autoComplete='off'
      />
      {showSuggestions && String(value || '').trim() ? (
        <ul className='absolute top-full left-0 z-30 mt-0.5 max-h-60 w-full min-w-[200px] overflow-auto rounded-md border border-gray-200 bg-white shadow-lg'>
          {loading && suggestions.length === 0 ? (
            <li className='px-2 py-1.5 text-left text-sm text-gray-500'>
              Searching...
            </li>
          ) : suggestions.length > 0 ? (
            suggestions.map((name) => (
              <li
                key={name}
                className={`cursor-pointer px-2 py-1.5 text-left text-sm hover:bg-[#0088cc] hover:text-white ${
                  selectedUserName === name || value === name
                    ? 'bg-gray-100'
                    : ''
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(name)}
              >
                {name}
              </li>
            ))
          ) : (
            <li className='px-2 py-1.5 text-left text-sm text-gray-500'>
              No client found
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
};

export default ClientNameSearch;
