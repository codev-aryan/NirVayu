# NirVayu - Ward-Wise Pollution Action Dashboard

## Overview

NirVayu is a dual-interface pollution monitoring and action dashboard for Delhi where each administrative ward is the smallest operational unit. The system provides two distinct user experiences:

- **Citizen Interface**: View ward-level pollution data, receive health advisories, follow prevention measures, and contribute through collective ward-level actions with a credit point system
- **Government Authority Interface**: Monitor pollution across wards, assign responsibility scores (WPRS), apply ward-specific control techniques, simulate policies, and manage pollution emergencies

The application fetches live AQI data from the AQICN API, matches stations to ward boundaries using spatial algorithms, and provides real-time ward-wise pollution metrics. A blockchain-secured citizen reporting system ensures tamper-proof pollution complaints.

## Recent Changes
- Updated `co2_budget_from_aqi` function in `server/storage.ts` to include dynamic factors (traffic, construction, industrial, stubble) while maintaining backward compatibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side navigation with role-based dashboards (`/citizen`, `/authority`)
- **State Management**: TanStack React Query for server state with 3-second polling for real-time ward data updates
- **UI Components**: shadcn/ui component library built on Radix UI primitives with extensive component coverage
- **Styling**: Tailwind CSS with custom CSS variables supporting role-based theming (citizen light theme vs authority dark theme)
- **Maps**: Leaflet with react-leaflet for ward visualization with AQI-colored circle markers
- **Charts**: Recharts for pollution trends and simulation visualizations
- **Fonts**: DM Sans (body), Outfit (display), JetBrains Mono (monospace)

### Backend Architecture
- **Runtime**: Node.js with Express, TypeScript compiled via tsx
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation schemas
- **Data Layer**: In-memory storage (`MemStorage` class) with GeoJSON ward boundaries loaded from attached assets
- **Real-time Updates**: Pollution data refreshes from AQICN API every 3 minutes with spatial matching to wards using Turf.js point-in-polygon
- **Blockchain Integration**: Hardhat local blockchain with ethers.js for tamper-proof citizen pollution reports (SHA-256 hashes stored on-chain)
- **Policy Simulator**: Backend ML model for predicting post-policy AQI based on dust, traffic, and construction reduction percentages
- **AI Intelligence**: Google Generative AI integration for ward-specific analysis and 90-day execution plans
- **Build System**: Custom esbuild script for production bundling with Vite for frontend

### Data Flow
- Ward boundaries loaded from Delhi GeoJSON file with 272 election wards
- AQICN API provides live station-based AQI data matched to wards using point-in-polygon (Turf.js)
- Each ward contains: AQI, PM2.5, PM10, NO2, WPRS score, CO2 budget, emergency mode status, active controls
- Environmental intelligence layer fetches traffic, industrial, construction, and stubble burning data from OpenStreetMap Overpass API
- Citizen reports generate SHA-256 hashes stored on blockchain for immutability

### Shared Code Structure
- `shared/schema.ts`: Drizzle ORM table definitions and Zod schemas for wards, users, reports
- `shared/routes.ts`: API endpoint definitions with request/response type schemas
- Path aliases: `@/` for client source, `@shared/` for shared modules, `@assets/` for attached files

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database operations with `drizzle-kit` for migrations

### External APIs
- **AQICN API**: Live air quality data for Delhi stations (requires `AQICN_API_KEY` environment variable)
- **OpenStreetMap Overpass API**: Traffic, road density, and construction activity data
- **Google Generative AI**: Ward intelligence analysis and action plan generation (requires `GOOGLE_API_KEY`)

### Blockchain
- **Hardhat**: Local Ethereum blockchain for development and testing
- **ethers.js**: Blockchain interaction for submitting and verifying pollution reports

### Key NPM Packages
- `@turf/turf`: Spatial analysis for matching AQI stations to ward polygons
- `framer-motion`: Page transitions and UI animations
- `recharts`: Data visualization for pollution trends
- `react-leaflet`: Interactive map components
- `zod`: Runtime validation for API requests and responses
