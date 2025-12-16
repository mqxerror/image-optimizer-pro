# Technical Specification: Error Boundary + Query Key Factory

**Author:** Alex (Solutions Architect)
**Date:** 2025-12-16
**Status:** Ready for Implementation
**Estimated Effort:** 4-6 hours total

---

## Overview

This specification covers two quick wins from the architecture review:

1. **Error Boundary Component** - Catch React errors gracefully
2. **Query Key Factory** - Standardize React Query cache keys

Both improvements enhance stability and maintainability with minimal risk.

---

## Part 1: Error Boundary Component

### Problem Statement

Currently, any unhandled error in a component crashes the entire application with a blank screen. Users must manually refresh, losing all unsaved work.

**Current behavior:**
```
Component throws error → React unmounts tree → White screen → User confused
```

**Desired behavior:**
```
Component throws error → Error Boundary catches → Fallback UI shown → User can recover
```

### Technical Design

#### 1.1 File Structure

```
src/
├── components/
│   └── error/
│       ├── ErrorBoundary.tsx      # Class component (required for getDerivedStateFromError)
│       ├── ErrorFallback.tsx      # Fallback UI component
│       └── index.ts               # Exports
```

#### 1.2 ErrorBoundary.tsx

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorFallback } from './ErrorFallback'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: unknown[]
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)

    // Call optional error handler (for analytics/monitoring)
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state when resetKeys change (allows recovery)
    if (this.state.hasError && this.props.resetKeys) {
      const keysChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      )
      if (keysChanged) {
        this.setState({ hasError: false, error: null })
      }
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}
```

#### 1.3 ErrorFallback.tsx

```tsx
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorFallbackProps {
  error: Error | null
  onReset?: () => void
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details (dev only) */}
          {import.meta.env.DEV && error && (
            <div className="p-3 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 overflow-auto max-h-32">
              {error.message}
            </div>
          )}

          {/* Recovery actions */}
          <div className="flex gap-3">
            {onReset && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={onReset}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleGoHome}
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 1.4 index.ts

```tsx
export { ErrorBoundary } from './ErrorBoundary'
export { ErrorFallback } from './ErrorFallback'
```

### Integration Points

#### App.tsx Integration

```tsx
// src/App.tsx
import { ErrorBoundary } from '@/components/error'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth routes - outside layout error boundary */}
        <Route path="/auth/login" element={<Login />} />
        {/* ... */}

        {/* Protected routes - wrapped in layout with its own boundary */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Layout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          {/* Child routes inherit boundary */}
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  )
}
```

#### Page-Level Boundaries (Optional)

For pages with complex state (Studio), add granular boundaries:

```tsx
// src/pages/Studio.tsx
import { ErrorBoundary } from '@/components/error'

export default function Studio() {
  return (
    <div className="flex">
      {/* Canvas area - isolated boundary */}
      <ErrorBoundary resetKeys={[selectedImage]}>
        <StudioCanvas />
      </ErrorBoundary>

      {/* Sidebar - isolated boundary */}
      <ErrorBoundary>
        <StudioSidebar />
      </ErrorBoundary>
    </div>
  )
}
```

---

## Part 2: Query Key Factory

### Problem Statement

Query keys are scattered across 23 hooks as string literals:

```typescript
// Current: Inconsistent, error-prone
queryKey: ['shopify-stores', user?.id]
queryKey: ['shopify-store', storeId]
queryKey: ['queue-page', organization?.id, page, pageSize, filters]
```

**Problems:**
1. Typos cause cache misses (`'shopify-store'` vs `'shopify-stores'`)
2. No autocomplete support
3. Hard to invalidate related queries
4. Inconsistent naming (`shopify-stores` vs `shopify-jobs-all`)

### Technical Design

#### 2.1 File Structure

```
src/
├── lib/
│   └── queryKeys.ts    # Query key factory
```

#### 2.2 queryKeys.ts

```typescript
// src/lib/queryKeys.ts

/**
 * Query Key Factory
 *
 * Centralized, type-safe query keys for React Query.
 *
 * Usage:
 *   queryKey: queryKeys.jobs.stats(orgId, 30)
 *   queryKey: queryKeys.shopify.stores(userId)
 *
 * Invalidation:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.shopify.store(storeId) })
 */

export const queryKeys = {
  // ============================================
  // AI Jobs & Processing
  // ============================================
  jobs: {
    all: ['jobs'] as const,
    stats: (orgId: string, days: number) =>
      ['jobs', 'stats', orgId, days] as const,
    active: (orgId: string) =>
      ['jobs', 'active', orgId] as const,
    detail: (jobId: string) =>
      ['jobs', 'detail', jobId] as const,
  },

  // ============================================
  // Processing Queue
  // ============================================
  queue: {
    all: ['queue'] as const,
    page: (orgId: string, page: number, pageSize: number, filters?: Record<string, unknown>) =>
      ['queue', 'page', orgId, page, pageSize, filters] as const,
    stats: (orgId: string) =>
      ['queue', 'stats', orgId] as const,
    folderStats: (orgId: string) =>
      ['queue', 'folder-stats', orgId] as const,
  },

  // ============================================
  // Shopify Integration
  // ============================================
  shopify: {
    all: ['shopify'] as const,
    stores: (userId: string) =>
      ['shopify', 'stores', userId] as const,
    store: (storeId: string) =>
      ['shopify', 'store', storeId] as const,
    storeStats: (storeId: string) =>
      ['shopify', 'store-stats', storeId] as const,
    allStoresStats: (userId: string) =>
      ['shopify', 'all-stores-stats', userId] as const,
    products: (storeId: string, options?: Record<string, unknown>) =>
      ['shopify', 'products', storeId, options] as const,
    productsInfinite: (storeId: string, options?: Record<string, unknown>) =>
      ['shopify', 'products-infinite', storeId, options] as const,
    jobs: (storeId: string, filters?: Record<string, unknown>) =>
      ['shopify', 'jobs', storeId, filters] as const,
    job: (jobId: string) =>
      ['shopify', 'job', jobId] as const,
  },

  // ============================================
  // Automation
  // ============================================
  automation: {
    all: ['automation'] as const,
    queue: (storeId: string, filters?: Record<string, unknown>) =>
      ['automation', 'queue', storeId, filters] as const,
    history: (storeId: string, limit?: number) =>
      ['automation', 'history', storeId, limit] as const,
    excluded: (storeId: string) =>
      ['automation', 'excluded', storeId] as const,
  },

  // ============================================
  // Templates
  // ============================================
  templates: {
    all: ['templates'] as const,
    list: (orgId: string) =>
      ['templates', 'list', orgId] as const,
    detail: (templateId: string) =>
      ['templates', 'detail', templateId] as const,
  },

  // ============================================
  // Projects
  // ============================================
  projects: {
    all: ['projects'] as const,
    list: (orgId: string) =>
      ['projects', 'list', orgId] as const,
    detail: (projectId: string) =>
      ['projects', 'detail', projectId] as const,
    previewImages: (projectIds: string[]) =>
      ['projects', 'preview-images', projectIds] as const,
    previewImagesSingle: (projectId: string) =>
      ['projects', 'preview-images', projectId] as const,
  },

  // ============================================
  // Activity & History
  // ============================================
  activity: {
    all: ['activity'] as const,
    data: (orgId: string, limit: number) =>
      ['activity', 'data', orgId, limit] as const,
  },

  // ============================================
  // Tokens & Billing
  // ============================================
  tokens: {
    all: ['tokens'] as const,
    account: (orgId: string) =>
      ['tokens', 'account', orgId] as const,
    transactions: (orgId: string) =>
      ['tokens', 'transactions', orgId] as const,
  },

  // ============================================
  // User & Organization
  // ============================================
  user: {
    all: ['user'] as const,
    permissions: (orgId: string, userId: string) =>
      ['user', 'permissions', orgId, userId] as const,
    profile: (userId: string) =>
      ['user', 'profile', userId] as const,
  },

  // ============================================
  // Studio
  // ============================================
  studio: {
    all: ['studio'] as const,
    presets: (orgId: string) =>
      ['studio', 'presets', orgId] as const,
    generations: (orgId: string) =>
      ['studio', 'generations', orgId] as const,
  },
} as const

// Type helper for extracting query key types
export type QueryKeys = typeof queryKeys
```

### Migration Guide

#### Before/After Examples

```typescript
// ❌ BEFORE: String literals
export function useShopifyStores() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['shopify-stores', user?.id],
    // ...
  })
}

// ✅ AFTER: Query key factory
import { queryKeys } from '@/lib/queryKeys'

export function useShopifyStores() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: queryKeys.shopify.stores(user?.id ?? ''),
    // ...
  })
}
```

```typescript
// ❌ BEFORE: Invalidation with string
queryClient.invalidateQueries({ queryKey: ['shopify-stores'] })

// ✅ AFTER: Invalidation with factory
queryClient.invalidateQueries({ queryKey: queryKeys.shopify.all })
// or specific:
queryClient.invalidateQueries({ queryKey: queryKeys.shopify.stores(userId) })
```

#### Migration Checklist

| File | Query Keys to Replace |
|------|----------------------|
| `useShopify.ts` | `shopify-stores`, `shopify-store`, `shopify-products`, `shopify-products-infinite` |
| `useStoreStats.ts` | `store-stats`, `all-stores-stats` |
| `usePendingQueue.ts` | `automation-queue`, `excluded-products`, `automation-history` |
| `useQueuePagination.ts` | `queue-page`, `queue-stats`, `queue-folder-stats` |
| `useTemplates.ts` | `templates`, `template` |
| `useActivityData.ts` | `activity-data` |
| `useProjectPreviewImages.ts` | `project-preview-images`, `project-preview-images-single` |
| `useJobsFiltering.ts` | `shopify-jobs-all` |
| `useAutomationHistory.ts` | `automation-history` |
| `useAiJobs.ts` | `ai-job-stats`, `active-jobs` (if exists) |

---

## Implementation Plan

### Phase 1: Create Files (30 min)

1. Create `src/components/error/ErrorBoundary.tsx`
2. Create `src/components/error/ErrorFallback.tsx`
3. Create `src/components/error/index.ts`
4. Create `src/lib/queryKeys.ts`

### Phase 2: Integrate Error Boundary (30 min)

1. Wrap root `<Routes>` in `<ErrorBoundary>`
2. Add boundary inside `<ProtectedRoute>` for layout
3. Test by throwing error in a component

### Phase 3: Migrate Query Keys (2-3 hours)

1. Start with high-traffic hooks:
   - `useShopify.ts`
   - `useQueuePagination.ts`
   - `useStoreStats.ts`
2. Update invalidation calls
3. Test each hook after migration
4. Complete remaining hooks

### Phase 4: Verification (30 min)

1. Run `npm run build` - no TypeScript errors
2. Test key flows:
   - Dashboard loads
   - Studio works
   - Shopify stores list
   - Queue pagination
3. Verify cache invalidation works

---

## Testing

### Error Boundary Tests

```typescript
// Manual test: Add this temporarily to any component
useEffect(() => {
  throw new Error('Test error boundary')
}, [])
```

Expected: ErrorFallback shows instead of white screen.

### Query Key Tests

```typescript
// Verify type safety
import { queryKeys } from '@/lib/queryKeys'

// Should autocomplete and type-check:
queryKeys.shopify.stores('user-123')  // ✅
queryKeys.shopify.stores(123)          // ❌ Type error
queryKeys.shopfy.stores('user-123')    // ❌ Typo caught
```

---

## Rollback Plan

Both changes are additive and low-risk:

1. **Error Boundary**: Remove `<ErrorBoundary>` wrapper from App.tsx
2. **Query Keys**: Keep old string literals until migration complete

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Unhandled errors crash app | Yes | No (fallback shown) |
| Query key typos possible | Yes | No (TypeScript) |
| Query key autocomplete | No | Yes |
| Invalidation consistency | Low | High |

---

## Appendix: Full Hook Migration Example

```typescript
// src/hooks/useShopify.ts - FULL MIGRATION

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function useShopifyStores() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.shopify.stores(user?.id ?? ''),
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      return data
    },
    enabled: !!user
  })
}

export function useShopifyStore(storeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shopify.store(storeId ?? ''),
    queryFn: async () => {
      if (!storeId) return null
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('id', storeId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!storeId
  })
}

export function useDisconnectStore() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase
        .from('shopify_stores')
        .delete()
        .eq('id', storeId)
      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate all shopify queries for this user
      queryClient.invalidateQueries({
        queryKey: queryKeys.shopify.stores(user?.id ?? '')
      })
    }
  })
}
```
