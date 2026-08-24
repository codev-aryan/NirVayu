// CAQM Official Graded Response Action Plan (GRAP) for NCR (Revision: 21.11.2025)

export interface GrapStageInfo {
  stage: "Stage I" | "Stage II" | "Stage III" | "Stage IV" | "Moderate / Good";
  stageName: "Poor" | "Very Poor" | "Severe" | "Severe +" | "Satisfactory / Good";
  aqiRange: string;
  color: string;
  badgeClass: string;
  description: string;
  enforcementActions: string[];
  citizenCharter: string[];
}

export function getOfficialGrapStage(aqi: number): GrapStageInfo {
  if (aqi > 450) {
    return {
      stage: "Stage IV",
      stageName: "Severe +",
      aqiRange: "AQI > 450",
      color: "bg-red-700 text-white animate-pulse",
      badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300",
      description: "CAQM GRAP Stage IV (Revision 21.11.2025): Severe+ Emergency air pollution conditions. Mandatory emergency measures invoked across NCR.",
      enforcementActions: [
        "Stop entry of all truck traffic into Delhi (except essential commodities / EVs / CNG / BS-VI Diesel trucks).",
        "Strict ban on Delhi-registered diesel Heavy Goods Vehicles (HGVs) (BS-IV and below).",
        "Complete Ban on C&D activities even for linear public projects (highways, flyovers, power transmission, pipelines).",
        "Mandatorily conduct classes for school children (Classes VI to IX & XI) in Hybrid / Online mode.",
        "Consider additional emergency measures: Odd-Even vehicle rationing, closure of colleges & non-emergency commercial activities."
      ],
      citizenCharter: [
        "Children, elderly, and individuals with respiratory or cardiovascular diseases must avoid outdoor activities and stay indoors.",
        "If required to move outdoors, wearing N95 masks is strongly advised.",
        "Minimize personal vehicle usage; work from home wherever feasible."
      ]
    };
  } else if (aqi >= 401) {
    return {
      stage: "Stage III",
      stageName: "Severe",
      aqiRange: "AQI 401 – 450",
      color: "bg-purple-700 text-white",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300",
      description: "CAQM GRAP Stage III (Revision 21.11.2025): Severe air quality. Strict C&D bans, mining closure, and vehicle restrictions active across NCR.",
      enforcementActions: [
        "Strict Ban on dust-generating C&D activities: Earthwork, piling, demolition, trenching, brickwork, RMC batching, welding & tile grinding.",
        "Close down operations of all stone crushers and mining activities across the entire NCR.",
        "Impose strict restrictions on plying of BS-III Petrol and BS-IV Diesel LMVs (4-wheelers) in Delhi-NCR districts.",
        "Ban Delhi-registered diesel MGVs (BS-IV & below) and non-Delhi BS-IV LCVs except essential commodity carriers.",
        "Conduct classes for primary school children (up to Class V) in mandatory Hybrid / Online mode."
      ],
      citizenCharter: [
        "Walk or use cycles for short distances; choose clean public transit.",
        "Work from home if position permits.",
        "Do not use coal or wood for heating; provide electric heaters to security staff to prevent open biomass burning.",
        "Combine errands and reduce vehicle trips."
      ]
    };
  } else if (aqi >= 301) {
    return {
      stage: "Stage II",
      stageName: "Very Poor",
      aqiRange: "AQI 301 – 400",
      color: "bg-orange-600 text-white",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300",
      description: "CAQM GRAP Stage II (Revision 21.11.2025): Very Poor air quality. Daily mechanized sweeping, water misting & DG set restrictions active.",
      enforcementActions: [
        "Daily mechanical/vacuum sweeping and water sprinkling with dust suppressants on identified roads before peak traffic hours.",
        "Intensify strict inspections for dust control measures at active Construction & Demolition (C&D) sites.",
        "Strictly implement regulated operation schedule of Diesel Generator (DG) sets across industrial, commercial, and residential sectors.",
        "Enhance vehicle parking fees to discourage private transport.",
        "Do not permit inter-state buses from NCR states to enter Delhi (except EVs / CNG / BS-VI Diesel)."
      ],
      citizenCharter: [
        "Use public transport and minimize the use of personal vehicles.",
        "Use navigation apps to take less congested routes even if slightly longer.",
        "Replace automobile air filters regularly at recommended intervals.",
        "Avoid dust-generating construction activities and open burning of solid waste."
      ]
    };
  } else if (aqi >= 201) {
    return {
      stage: "Stage I",
      stageName: "Poor",
      aqiRange: "AQI 201 – 300",
      color: "bg-amber-600 text-white",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300",
      description: "CAQM GRAP Stage I (Revision 21.11.2025): Poor air quality. Baseline dust mitigation, trash burning vigil & PUC enforcement active.",
      enforcementActions: [
        "Ensure proper implementation of dust mitigation guidelines at C&D sites and mandatory web portal registration for plots ≥500 sqm.",
        "Periodic mechanized sweeping & water sprinkling on roads; intensify anti-smog guns at construction & road repair sites.",
        "Stringently enforce prohibition on open burning of biomass & municipal solid waste; strict vigil at landfills.",
        "Deploy traffic police at heavy traffic corridors & congestion-prone intersections for smooth flow.",
        "Strict vigilance & enforcement of PUC norms; impound visibly polluting vehicles; enforce non-destined truck diversion via Peripheral Expressways.",
        "Strictly enforce ban on coal/firewood fuel in tandoors in hotels, restaurants & open eateries."
      ],
      citizenCharter: [
        "Keep vehicle engines properly tuned and maintain recommended tyre pressure.",
        "Keep vehicle PUC certificates up to date.",
        "Turn off engine at red lights (no idling).",
        "Do not litter or dispose of garbage in open spaces; report polluting activities on 311 / SAMEER app."
      ]
    };
  } else {
    return {
      stage: "No GRAP Required",
      stageName: "Satisfactory / Good",
      aqiRange: "AQI ≤ 200",
      color: "bg-emerald-600 text-white",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300",
      description: "No GRAP emergency restrictive action is required (AQI ≤ 200). Baseline environmental monitoring conditions apply under CAQM regulations.",
      enforcementActions: [
        "No emergency GRAP restrictions or bans active (AQI is within safe/acceptable limits).",
        "Routine water sprinkling on vulnerable dust corridors and unpaved roads.",
        "Standard traffic flow monitoring and traffic signal timing synchronization.",
        "Ongoing citizen complaint resolution and routine spot checks on illegal dumping."
      ],
      citizenCharter: [
        "Air quality is satisfactory. No emergency health advisories active.",
        "Maintain green cover and plant more trees in your neighborhood.",
        "Prefer electric vehicles or public transit for daily commute."
      ]
    };
  }
}
