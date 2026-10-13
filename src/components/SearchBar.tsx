import { useEffect, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/utils/cn'
import { CONTROL } from './Field'
import { SearchMark } from './icons'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  id?: string
  className?: string
}

/** 300ms of debounce: long enough not to fire per keystroke, short enough that
 *  an operator typing a household name does not notice it. */
export function SearchBar({
  value,
  onChange,
  placeholder,
  label = 'Search',
  id = 'search',
  className,
}: SearchBarProps) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 300)

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={cn('relative flex items-center', className)}>
      <label htmlFor={id} className="vh">
        {label}
      </label>
      <span className="pointer-events-none absolute left-3 flex text-ink-3">
        <SearchMark />
      </span>
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, 'h-9 py-0 pr-3 pl-9', '[&::-webkit-search-cancel-button]:hidden')}
      />
    </div>
  )
}
