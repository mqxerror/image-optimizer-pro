# Image Processing Pipeline - Test Plan

## Overview

This document outlines the test coverage for the Image Processing Pipeline in Image Optimizer Pro. The pipeline handles image optimization through Kie.ai's Flux Kontext API.

## Test Categories

### 1. Unit Tests

#### optimize-image Edge Function (`edge-functions/optimize-image.test.ts`)

| Test Area | Coverage | Status |
|-----------|----------|--------|
| Prompt Generation | Full | ✅ |
| Settings Combinations | Full | ✅ |
| Kie.ai API Request Format | Full | ✅ |
| Async Task Handling | Full | ✅ |
| Direct Response Handling | Full | ✅ |
| Error Response Handling | Full | ✅ |
| Passthrough Mode | Full | ✅ |
| Request Validation | Full | ✅ |
| CORS Handling | Full | ✅ |
| Response Parsing | Full | ✅ |

**Key Test Scenarios:**
- Default prompt generation
- Enhancement combinations (quality, background, lighting, colors)
- API request body structure
- Task ID extraction from multiple response formats
- Polling mechanism for async tasks
- Timeout handling
- Passthrough on API unavailability

#### process-image Edge Function (`edge-functions/process-image.test.ts`)

| Test Area | Coverage | Status |
|-----------|----------|--------|
| Request Validation | Full | ✅ |
| Queue Item Fetching | Full | ✅ |
| Google Drive Integration | Full | ✅ |
| Storage Upload | Full | ✅ |
| Kie.ai Optimization Call | Full | ✅ |
| History Record Creation | Full | ✅ |
| Queue Item Completion | Full | ✅ |
| Error Handling | Full | ✅ |
| Progress Tracking | Full | ✅ |

**Key Test Scenarios:**
- Authorization validation
- Queue item not found handling
- Google Drive connection validation
- Storage path generation
- Processing flow sequence (10% → 30% → 50% → 80% → 100%)
- Passthrough mode handling
- Failed processing recovery

### 2. Integration Tests

#### Queue Processing Flow (`integration/queue-processing.test.ts`)

| Test Area | Coverage | Status |
|-----------|----------|--------|
| Adding Items to Queue | Full | ✅ |
| Queue Stats Calculation | Full | ✅ |
| Queue Filtering | Full | ✅ |
| Single Item Operations | Full | ✅ |
| Bulk Operations | Full | ✅ |
| Process Queue Trigger | Full | ✅ |
| Progress Tracking | Full | ✅ |
| Real-time Updates | Full | ✅ |
| Selection State | Full | ✅ |
| View Modes | Full | ✅ |

**Key Test Scenarios:**
- Batch file addition to queue
- Token balance validation
- Status filtering (queued, processing, failed)
- Project filtering
- File name search
- Bulk delete/retry operations
- Concurrent processing
- History record flow

#### Kie.ai API Integration (`integration/kie-ai-api.test.ts`)

| Test Area | Coverage | Status |
|-----------|----------|--------|
| Generate Endpoint | Full | ✅ |
| Status Polling Endpoint | Full | ✅ |
| Polling Mechanism | Full | ✅ |
| Task ID Extraction | Full | ✅ |
| Result URL Extraction | Full | ✅ |
| Error Scenarios | Full | ✅ |
| Passthrough Triggers | Full | ✅ |

**Key Test Scenarios:**
- API request/response formats
- Bearer token authentication
- Async task polling (2s intervals, 30 max attempts)
- Multiple task ID formats
- Multiple result URL formats
- Rate limiting (429)
- API errors (401, 403, 500, 503)
- Network/timeout errors

## Test Commands

```bash
# Run all tests
npm run test

# Run tests once (CI mode)
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Critical Paths Tested

### Happy Path
1. User adds images to queue → Queue items created with status 'queued'
2. User triggers processing → Items updated to 'processing'
3. Image downloaded from Google Drive → Progress 30%
4. Original uploaded to Supabase Storage → Progress 50%
5. Kie.ai optimization called → Progress 80%
6. Optimized image uploaded → Progress 100%
7. History record created → Queue item marked 'completed'

### Passthrough Path
1. API key not configured → Passthrough response
2. Kie.ai API error → Passthrough with original
3. Polling timeout → Passthrough with original
4. Rate limited → Passthrough with original

### Error Path
1. No Google Drive connection → Failed with error message
2. File not found → Failed with error message
3. Storage upload fails → Failed with error message
4. Processing error → Queue item marked 'failed'

## Coverage Summary

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Edge Functions | 2 | ~80 | High |
| Integration | 2 | ~60 | High |
| **Total** | **4** | **~140** | **High** |

## Recommendations

### High Priority
1. **Add E2E Tests**: Use Playwright/Cypress to test full user flows
2. **API Contract Tests**: Add contract tests for Kie.ai API
3. **Load Testing**: Test concurrent processing with many items

### Medium Priority
1. **Component Tests**: Add React Testing Library tests for Queue page
2. **Webhook Tests**: Add tests for Stripe webhook handling
3. **Real-time Tests**: Test Supabase subscription updates

### Low Priority
1. **Visual Regression**: Add screenshot comparison tests
2. **Accessibility Tests**: Add a11y tests with axe-core
3. **Performance Tests**: Add performance benchmarks

## Test Data Mocks

The following mock factories are available in `src/__tests__/mocks/`:

- `createMockQueueItem(overrides)` - Creates mock queue item
- `createMockHistoryItem(overrides)` - Creates mock history record
- `createMockGoogleDriveConnection(overrides)` - Creates mock Drive connection
- `createMockKieAiAsyncResponse()` - Creates async Kie.ai response
- `createMockKieAiSuccessStatus()` - Creates successful status response
- `createMockKieAiPendingStatus()` - Creates pending status response
- `createMockKieAiFailedStatus()` - Creates failed status response

## Notes

- Tests use Vitest with jsdom environment
- Edge function tests mock the Deno runtime behavior
- Integration tests mock Supabase and external API calls
- All tests are isolated and do not require network access
