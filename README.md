# NirVayu

NirVayu is an environmental command center designed for monitoring, forecasting, and mitigating air pollution across the wards of Delhi. The application integrates real-time air quality indexing, automated predictive analytics, and a secure ledger to coordinate efforts between citizens and local authorities.

## Features

### Citizen Portal
- Interactive Ward Map: Visualizes air quality indices across Delhi.
- Personalized Safe Life Planner: Generates health recommendations and safety windows based on age, respiratory conditions, and planned outdoor hours.
- Daily Actions & Checklist: Encourages green actions that earn citizen credits for the ward.
- Pollution Reporting: Allows citizens to capture and submit photos of local pollution incidents.

### Authority Portal
- Environmental Command Center: Allows authorities to declare emergency modes and enforce active mitigation controls (e.g. odd-even traffic rules, construction halts).
- Incident Verification: Enables authorities to review citizen reports and trigger audit checks.
- On-Chain Ledger: Automatically computes cryptographic hashes for reported incidents to maintain data integrity.

### Analytics Engine
- Heuristic-backed machine learning model forecasting short-term (24h) air quality trends.
- Automated centroid fallback for ward proximity estimation.

## Setup and Installation

### Prerequisites
- Node.js (v20 or higher)
- Python (v3 or higher)
- PostgreSQL database

### Configuration
Create a `.env` file in the root directory and configure the following variables:

```env
DATABASE_URL=postgresql://username:password@host/database
NASA_FIRMS_API_KEY=your_nasa_firms_key
GEMINI_API_KEY=your_google_gemini_key
AQICN_API_KEY=your_aqicn_token
AQI_TOKEN=your_alternative_aqi_token
PORT=5002
```

### Installing Dependencies
```bash
npm install
```

### Running the Application

To start the development server (which runs both the frontend and backend on port 5002):
```bash
npm run dev
```

To run type checks and verify compilation:
```bash
npm run check
```

## Default Authority Credentials
To access the restricted Authority Portal, use one of the following pre-seeded credentials:

### Administrator Account
- **Authority ID:** admin
- **Access Code:** password123

### Delhi Authority Account
- **Authority ID:** authority_delhi
- **Access Code:** delhi_secure_2024

