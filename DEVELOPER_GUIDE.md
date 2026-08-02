# Developer Guide - Nostos Operator Console

## Quick Start

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Run tests (42 of 44 passing)
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build locally
npm run preview
```

## Architecture Overview

### State Management Pattern

```
Server State         → TanStack Query (cache is source of truth)
Filter/Sort/Pagination → URL Search Params (bookmarkable, shareable)
Session (user, id)   → React Context (AuthContext)
Form Data            → React Hook Form (not useState)
Local UI State       → useState (component-scoped only)
```

### Module Structure

```
src/
├── api/                  # TanStack Query setup
│   ├── client.ts         # Axios instance with interceptors
│   ├── queryClient.ts    # Query client configuration
│   ├── queries/          # Query hooks (useHouseholds, useHousehold, etc.)
│   └── mutations/        # Mutation hooks (useSignin, useCreateHousehold, etc.)
├── contexts/             # React Context (session/auth only)
├── modules/              # Feature folders (auth, dashboard, households)
│   ├── auth/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── types.ts
│   │   └── hooks/
│   ├── dashboard/
│   ├── households/
│   └── ...
├── components/           # Shared UI (Layout, Modal, Breadcrumb, etc.)
├── routes/               # Route config and guards
├── styles/               # CSS and design tokens
├── utils/                # Formatters, validators, helpers
├── test/                 # Test setup and utilities
└── types/                # Shared types across modules
```

## Key Files

### Configuration
- `vite.config.ts` - Vite and Vitest config
- `tsconfig.app.json` - TypeScript app config with `@/` path alias
- `eslint.config.js` - ESLint configuration
- `.env` - Environment variables

### API Integration
- `src/api/client.ts` - Axios client with 401/403 interceptors
- `src/api/queryClient.ts` - TanStack Query client with defaults
- `src/utils/responseHandlers.ts` - Backend response transformation

### Authentication
- `src/contexts/AuthContext.tsx` - Session context provider
- `src/routes/ProtectedRoute.tsx` - Protected route wrapper
- `src/modules/auth/` - Signin flow

### Styling
- `src/styles/tokens.css` - Design tokens (colors, spacing, breakpoints)
- `src/styles/console.css` - Component styles and utilities
- `src/index.css` - Base styles

## Common Tasks

### Adding a New Page

1. Create page component: `src/modules/feature/pages/FeaturePage.tsx`
2. Create route in `src/routes/index.tsx`
3. Import and add route:
   ```typescript
   <Route path="/console/feature" element={<ProtectedRoute><FeaturePage /></ProtectedRoute>} />
   ```

### Adding a New API Query

1. Create hook: `src/modules/feature/api/useFeature.ts`
2. Use TanStack Query pattern:
   ```typescript
   export function useFeature(id: string) {
     return useQuery({
       queryKey: ['console', 'feature', id],  // Hierarchical key
       queryFn: async () => {
         const { data } = await apiClient.get(`/console/feature/${id}`)
         return transformBackendResponse(data)
       },
       enabled: !!id,  // Gate query execution
     })
   }
   ```

### Adding a New Form

1. Create component: `src/modules/feature/components/FeatureForm.tsx`
2. Use React Hook Form with validation:
   ```typescript
   const { register, handleSubmit, formState: { errors } } = useForm({
     mode: 'onBlur',
     defaultValues: { /* ... */ }
   })
   ```
3. Add mutation hook for submission
4. Invalidate related queries on success:
   ```typescript
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['console', 'features'] })
   }
   ```

### Handling Errors

All HTTP errors are caught by the response interceptor:

```typescript
// 401 Unauthorized → Auto-redirect to /console/signin
// 403 Forbidden → Show toast error
// 4xx/5xx → Show toast with error message
```

For mutation errors, use TanStack Query's error handling:

```typescript
const { mutate, error } = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onError: (error) => {
    // TanStack Query stores error in error state
    // Display to user via error state
  },
})
```

### Testing Components

Use `renderWithProviders` from test utils:

```typescript
import { renderWithProviders } from '@/test/test-utils'

test('renders household detail', () => {
  renderWithProviders(
    <Routes>
      <Route path="/households/:id" element={<HouseholdDetailPage />} />
    </Routes>,
    { route: '/households/123' }
  )
  // Test assertions...
})
```

### Debugging

**TanStack Query DevTools**:
```typescript
// Add to App.tsx during development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<ReactQueryDevtools />
```

**React DevTools**:
- Install React DevTools browser extension
- Inspect component props and state
- Profiler for performance

**Network Tab**:
- Check request/response bodies
- Verify headers (cookies, content-type, etc.)
- Monitor timing and cache behavior

## Performance Considerations

### Query Keys
- Hierarchical keys: `['domain', 'resource', 'filters']`
- Enables targeted invalidation: `queryClient.invalidateQueries({ queryKey: ['console'] })`
- Prevents over-fetching

### Caching Strategy
```typescript
// Household list: revalidate after 5 minutes
staleTime: 5 * 60 * 1000

// Household detail: keep fresh for session
staleTime: Infinity

// Dashboard metrics: fresh every refetch
staleTime: 0
```

### Debouncing
Search input debounced 500ms to reduce API calls:
```typescript
const debouncedSearch = useDebouncedValue(searchTerm, 500)
// Search triggers when debouncedSearch changes
```

### Optimistic Updates
All mutations use optimistic updates for better UX:
```typescript
onMutate: (newData) => {
  // Snapshot old data
  // Update UI immediately with new data
},
onSuccess: () => {
  // Invalidate query for consistency check
},
onError: (error, newData, context) => {
  // Rollback to snapshot
}
```

## Code Style & Conventions

### Naming
- Components: `PascalCase` (e.g., `HouseholdDetail.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useHouseholds.ts`)
- Files/Directories: `kebab-case` (e.g., `household-detail.tsx`)
- Constants: `SCREAMING_SNAKE_CASE`

### Imports
- Prefer absolute paths with `@/` alias
- Order: React → External packages → Internal modules → Relative imports
- Group related imports together

### Type Definitions
- Place types in `src/types/` for cross-module types
- Place module-specific types in module's `types.ts`
- Use `interface` for object shapes, `type` for unions/tuples

### Comments
- Avoid obvious comments ("Get the user's name")
- Add comments for WHY, not WHAT
- Document non-obvious constraints or workarounds

## Common Patterns

### Loading State Pattern
```typescript
const { data, isLoading, error } = useHouseholds()

if (isLoading) return <p>Loading...</p>
if (error) return <p>Error: {error.message}</p>
return <HouseholdsList households={data} />
```

### Pagination Pattern
```typescript
const [page, setPage] = useState(1)
const { data } = useHouseholds({ page })

// Use URL params instead for bookmarkable URLs:
const [params] = useSearchParams()
const page = parseInt(params.get('page') || '1')
```

### Form Submission Pattern
```typescript
const { mutate, isPending } = useCreateHousehold()
const { handleSubmit, register } = useForm()

const onSubmit = (data) => {
  mutate(data, {
    onSuccess: () => navigate('/console/households'),
    onError: (error) => toast.error(error.message),
  })
}
```

## Troubleshooting

### "Cannot find module '@/...'"
- Check `tsconfig.app.json` has `"@": ["./src"]` in paths
- Check `vite.config.ts` has alias configured
- Restart dev server

### Tests timing out
- MSW mock handlers may not match request URL
- Use wildcard in mock: `http.get('*/console/households', ...)`
- Check query keys match expected API calls

### Form validation not showing
- Verify `mode: 'onBlur'` in useForm config
- Check error message has `role="alert"`
- Test with DevTools to see if error state exists

### Stale data after mutation
- Check `invalidateQueries()` called in onSuccess
- Verify query key matches what's being queried
- Try cache busting: `exact: true` in invalidation

### Build size larger than expected
- Run `npm run build -- --analyze`
- Check for duplicate dependencies
- Look for unused imports
- Consider code splitting large modules

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Router Docs](https://reactrouter.com)
- [React Hook Form Docs](https://react-hook-form.com)
- [Axios Docs](https://axios-http.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Vitest Docs](https://vitest.dev)
- [Testing Library Docs](https://testing-library.com)

## Getting Help

1. Check existing documentation in this repo
2. Review similar features already implemented
3. Check browser DevTools (Console, Network tabs)
4. Check server logs for API errors
5. Ask in team Slack channel with:
   - Error message/screenshot
   - What you tried
   - Expected vs actual behavior

