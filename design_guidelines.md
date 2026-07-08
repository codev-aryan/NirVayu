# Pollution Monitoring Dashboard - Design Guidelines

## Design Approach
**Selected System**: shadcn UI + Tailwind CSS
**Rationale**: Dashboard applications demand consistency, accessibility, and proven patterns. shadcn provides production-ready components optimized for data-heavy interfaces while maintaining customization flexibility.

## Core Design Principles
- Data-first hierarchy: Critical metrics immediately visible
- Scannable layouts: Clear visual grouping and separation
- Minimal cognitive load: Clean, uncluttered presentation
- Functional clarity: Every element serves the monitoring workflow

## Typography System
- **Headings**: Font family from shadcn defaults (Inter/system-ui)
  - H1: text-3xl font-bold (Dashboard title)
  - H2: text-xl font-semibold (Section headers)
  - H3: text-lg font-medium (Card titles)
- **Body**: text-sm for data labels, text-base for descriptions
- **Metrics**: text-4xl font-bold for primary stats, text-2xl for secondary
- **Monospace**: font-mono for numerical data and timestamps

## Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 (p-4, gap-6, mb-8)
- Container: max-w-screen-2xl mx-auto px-6
- Card padding: p-6
- Section spacing: space-y-6
- Grid gaps: gap-4 to gap-6

**Grid Structure**:
- Primary layout: Two-column split (sidebar + main content)
- Sidebar: w-64 fixed (navigation, quick filters)
- Main: flex-1 with responsive grid system
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Wide data views: grid-cols-1 lg:grid-cols-2

## Component Library

### Navigation & Structure
- **Sidebar**: Fixed navigation with monitoring station list, filter controls
- **Top bar**: Page title, real-time clock, user profile, emergency alert toggle
- **Breadcrumbs**: Location hierarchy for multi-station monitoring

### Data Display Components
- **Metric Cards**: Card component with large number display, trend indicator (↑↓), subtitle context
- **Status Badges**: Badge component with variants (default/success/warning/destructive) for AQI levels
- **Data Tables**: Table component with sortable columns, row hover states, pagination
- **Charts Area**: Recharts integration for line graphs (pollution trends), bar charts (comparative data)
- **Mini Sparklines**: Inline trend visualization within cards

### Interactive Controls
- **Emergency Panel**: Alert-destructive card with prominent Button (destructive variant), confirmation dialog
- **Filter Controls**: Select dropdowns, DatePicker for time ranges, ToggleGroup for view modes
- **Station Selector**: Combobox component for search/select monitoring locations
- **Data Refresh**: Button with loading spinner state, auto-refresh toggle Switch

### Status & Alerts
- **Alert Banners**: Alert component (top of page) for critical pollution events
- **Live Indicators**: Pulsing dot animation for active monitoring
- **Threshold Markers**: Visual indicators when readings exceed safe limits
- **Notification Toast**: Toast component for real-time updates

## Dashboard Sections (Top to Bottom)

1. **Header Bar**: Logo, page title, real-time clock, emergency controls, profile
2. **Alert Zone**: Critical alerts banner (conditional display)
3. **Key Metrics Row**: 4-column grid of primary pollution indicators (PM2.5, PM10, AQI, CO2)
4. **Live Charts Section**: 2-column grid with time-series graphs
5. **Monitoring Stations Table**: Full-width data table with current readings
6. **Detailed Analytics**: Tabbed interface (Today/Week/Month views)

## Visual Hierarchy Rules
- Emergency controls: Prominent placement, destructive styling
- Real-time data: Largest typography, bold weights
- Historical data: Secondary emphasis, muted text
- Status badges: Inline with metrics, color-coded severity
- Charts: Maximum height 300-400px for scannability

## Images
**No hero images** - Dashboard requires immediate data access. Use:
- Small station thumbnail images in sidebar list (64x64px, rounded)
- Map integration showing station locations (OpenStreetMap embed)
- Optional: Weather icon integration for contextual data

## Interactions (Minimal)
- Hover states: Card elevation (shadow-md to shadow-lg)
- Active filters: Background highlight on selected options
- Loading states: Skeleton components during data fetch
- No scroll animations or transitions - performance priority

**Critical Constraint**: All emergency controls must be accessible within 2 clicks maximum. Status information must update without page refresh.