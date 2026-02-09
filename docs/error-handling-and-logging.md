# Error Handling and Logging

This document outlines the error handling patterns, logging strategies, and known console errors in the Hospital Queue System.

## Error Handling Patterns

### React Error Boundaries
The application uses React's best practices for handling component-level errors. Key interactive components are wrapped in error boundaries to prevent a single failure from crashing the entire UI.

### Supabase Error Handling
Database operations follow a consistent pattern:
```typescript
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  // process data
} catch (error) {
  console.error('Data Fetch Error:', error);
  // User-facing error state update
}
```

## Known Console Errors (Environment Related)

The following errors may appear in the browser console during development or production. These are typically environment-specific and do not impact application functionality.

### 1. `ERR_BLOCKED_BY_CLIENT` for `fingerprint.js`
- **Error**: `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT` for `:5173/node_modules/lucide-react/dist/esm/icons/fingerprint.js`
- **Cause**: Aggressive ad-blockers or built-in browser "Fingerprinting Protection" (common in Incognito mode) block scripts containing the word "fingerprint".
- **Impact**: Can cause a **blank page** because the browser fails to load a piece of the JavaScript dependency tree.
- **Resolution**: A permanent fix has been applied in `vite.config.ts` using a `resolve.alias` to redirect the `fingerprint` icon to the `activity` icon. This prevents the browser from encountering the blocked filename.

### 2. `Could not establish connection. Receiving end does not exist.`
- **Error**: `Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.`
- **Cause**: This is a standard Chrome Extension error. It occurs when a browser extension (like LastPass, Grammarly, or Google Translate) attempts to communicate with a background script that has been invalidated due to a page reload or update.
- **Impact**: None. This is internal to the browser extensions and does not affect the Hosq application.
- **Resolution**: Can be ignored. Occurs less frequently in Incognito mode or with extensions disabled.

## Logging Strategy

### Development
- `console.log` and `console.error` are used for debugging.
- Vite's HMR logs provide detailed information on module updates.

### Production
- Critical errors are logged to the console for easier remote debugging.
- Integration with external monitoring services (e.g., Sentry) is recommended for production environments.

---
*Author: Peter Thairu Muigai*
*Version: 1.0.0*
