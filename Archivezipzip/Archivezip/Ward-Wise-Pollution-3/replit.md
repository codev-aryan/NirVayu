# NirVayu - Ward-Wise Pollution Action Dashboard

## Overview

NirVayu is a dual-interface pollution monitoring and action dashboard where each administrative ward is the smallest operational unit. The system provides:

- **Citizen Interface**: View ward-level pollution data, receive health advisories, follow prevention measures, and contribute through collective ward-level actions
- **Government Authority Interface**: Monitor pollution across wards, assign responsibility scores, apply ward-specific control techniques, simulate policies, and manage pollution emergencies

All features are explicitly ward-wise, with city-level views only as aggregated summaries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter for client-side navigation with role-based dashboards (`/citizen`, `/authority`)
- **State Management**: TanStack React Query for server state with 30-second polling for ward data
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables supporting role-based theming (citizen vs authority modes)
- **Maps**: Leaflet with react-leaflet for ward visualization with AQI-colored markers
- **Charts**: Recharts for pollution trends and simulation visualizations
- **Animations**: Framer Motion for smooth transitions

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation schemas
- **Data Layer**: In-memory storage with simulated real-time pollution updates (5-second intervals)
- **Database Schema**: Drizzle ORM with PostgreSQL (schema in `shared/schema.ts`)
- **Build System**: Custom esbuild script for production bundling with selective dependency bundling

### Data Flow
- Wards contain pollution metrics (AQI, PM2.5, PM10, NO2), control status, emergency mode, and citizen credit points
- Mock data simulates 8 Delhi wards with randomized pollution values
- WPRS (Ward Pollution Responsibility Score) tracks mitigation efforts
- CO2 budget remaining per ward for climate tracking

### Shared Code Structure
- `shared/schema.ts`: Database table definitions and TypeScript types
- `shared/routes.ts`: API endpoint definitions with request/response schemas
- Path aliases: `@/` for client source, `@shared/` for shared modules

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database operations with `drizzle-kit` for migrations

### UI Libraries
- **Radix UI**: Accessible component primitives (dialog, tabs, select, etc.)
- **Leaflet**: Interactive mapping library for ward boundaries
- **Recharts**: Data visualization for pollution charts
- **Embla Carousel**: Touch-friendly carousels

### Build & Development
- **Vite**: Development server with HMR and production bundling
- **esbuild**: Server-side bundling for optimized cold starts
- **TypeScript**: Full type coverage across client, server, and shared code

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development environment indicator