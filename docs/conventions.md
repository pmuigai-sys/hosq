# Code Conventions

## General Principles
- **DRY (Don't Repeat Yourself)**: Extract common logic into hooks or utility functions.
- **SOLID**: Each component and function should have a single responsibility.
- **Type Safety**: Use TypeScript interfaces for all data structures, especially those mapping to the database.

## Naming Conventions
- **Components**: PascalCase (e.g., `PatientPortal.tsx`).
- **Hooks**: camelCase starting with `use` (e.g., `useQueue.ts`).
- **Utilities/Libraries**: camelCase (e.g., `supabase.ts`).
- **Database Tables**: snake_case (e.g., `queue_entries`).

## Project Structure
```text
src/
├── components/   # Reusable UI components
├── contexts/     # React Context providers (Auth, etc.)
├── hooks/        # Custom React hooks
├── lib/          # External service clients and utilities
└── types/        # TypeScript definitions
```

## Styling
- Use **Tailwind CSS** for all styling.
- Follow a mobile-first responsive design approach.
- Maintain a consistent professional color palette (Blue/Gray/White).

## State Management
- **Local State**: `useState` for UI-local state.
- **Server State**: Managed via Supabase and reflected through custom hooks like `useQueueEntries`.
- **Global State**: React Context for long-lived state like `Auth`.

---
*Author: Peter Thairu Muigai*
*Version: 1.0.0*
