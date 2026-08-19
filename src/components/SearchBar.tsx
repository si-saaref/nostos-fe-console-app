import { useEffect, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { SearchMark } from './icons'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  id?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  label = 'Search',
  id = 'search',
}: SearchBarProps) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 300)

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="search-field">
      <label htmlFor={id} className="vh">
        {label}
      </label>
      <span className="search-field-icon">
        <SearchMark />
      </span>
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
