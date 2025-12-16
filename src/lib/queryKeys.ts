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
    page: <T = unknown>(orgId: string, page: number, pageSize: number, filters?: T) =>
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
    queue: <T = unknown>(storeId: string, filters?: T) =>
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
      ['projects', 'preview-images-single', projectId] as const,
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

  // ============================================
  // Image Processing (IOPaint + Imaginary)
  // ============================================
  imageProcessing: {
    all: ['image-processing'] as const,
    pipelines: (orgId: string) =>
      ['image-processing', 'pipelines', orgId] as const,
    pipeline: (pipelineId: string) =>
      ['image-processing', 'pipeline', pipelineId] as const,
    jobs: (orgId: string) =>
      ['image-processing', 'jobs', orgId] as const,
    job: (jobId: string) =>
      ['image-processing', 'job', jobId] as const,
    health: () =>
      ['image-processing', 'health'] as const,
  },

  // ============================================
  // Billing & Subscriptions
  // ============================================
  billing: {
    all: ['billing'] as const,
    packages: () =>
      ['billing', 'packages'] as const,
    plans: () =>
      ['billing', 'plans'] as const,
    subscription: (orgId: string) =>
      ['billing', 'subscription', orgId] as const,
    purchases: (orgId: string) =>
      ['billing', 'purchases', orgId] as const,
  },

  // ============================================
  // Team & Groups
  // ============================================
  team: {
    all: ['team'] as const,
    members: (orgId: string) =>
      ['team', 'members', orgId] as const,
    invitations: (orgId: string) =>
      ['team', 'invitations', orgId] as const,
    groups: (orgId: string) =>
      ['team', 'groups', orgId] as const,
    group: (groupId: string) =>
      ['team', 'group', groupId] as const,
  },

  // ============================================
  // AppSumo
  // ============================================
  appsumo: {
    all: ['appsumo'] as const,
    licenses: (orgId: string) =>
      ['appsumo', 'licenses', orgId] as const,
    benefits: (orgId: string) =>
      ['appsumo', 'benefits', orgId] as const,
  },
} as const

// Type helper for extracting query key types
export type QueryKeys = typeof queryKeys
