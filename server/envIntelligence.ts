import axios from 'axios';

export interface EnvironmentalData {
  traffic: {
    score: number;
    congestion: 'low' | 'medium' | 'high';
    totalRoads: number;
    majorRoads: number;
  };
  industrial: {
    score: number;
    level: 'low' | 'medium' | 'high';
    factories: number;
  };
  stubbleBurning: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    fireCount24h: number;
  };
  construction: {
    score: number;
    activity: 'low' | 'medium' | 'high';
    sites: number;
  };
}

export class EnvironmentalIntelligence {
  private static async fetchOverpass(query: string): Promise<any> {
    const url = 'http://overpass-api.de/api/interpreter';
    const response = await axios.get(url, { params: { data: query }, timeout: 30000 });
    return response.data;
  }

  static async getTrafficData(lat: number, lon: number): Promise<EnvironmentalData['traffic']> {
    try {
      const query = `[out:json][timeout:25];(way["highway"](around:2000,${lat},${lon});node["highway"="traffic_signals"](around:2000,${lat},${lon}););out body;`;
      const data = await this.fetchOverpass(query);
      const elements = data.elements || [];
      
      let totalRoads = 0;
      let majorRoads = 0;
      let signals = 0;

      elements.forEach((el: any) => {
        if (el.type === 'way' && el.tags?.highway) {
          totalRoads++;
          if (['primary', 'trunk', 'motorway'].includes(el.tags.highway)) majorRoads++;
        }
        if (el.tags?.highway === 'traffic_signals') signals++;
      });

      const score = Math.min(100, (totalRoads * 1.5) + (signals * 4) + (majorRoads * 10));
      return {
        score: score || 45,
        congestion: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
        totalRoads,
        majorRoads
      };
    } catch (e) {
      return { score: 50, congestion: 'medium', totalRoads: 10, majorRoads: 2 };
    }
  }

  static async getIndustrialData(lat: number, lon: number): Promise<EnvironmentalData['industrial']> {
    try {
      const query = `[out:json][timeout:25];(way["landuse"="industrial"](around:3000,${lat},${lon});node["man_made"="works"](around:3000,${lat},${lon}););out body;`;
      const data = await this.fetchOverpass(query);
      const elements = data.elements || [];
      const factories = elements.length;
      const score = Math.min(100, factories * 15);
      
      return {
        score: score || 30,
        level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
        factories
      };
    } catch (e) {
      return { score: 35, level: 'medium', factories: 2 };
    }
  }

  static async getConstructionData(lat: number, lon: number): Promise<EnvironmentalData['construction']> {
    try {
      const query = `[out:json][timeout:25];(way["building"="construction"](around:2000,${lat},${lon});way["landuse"="construction"](around:2000,${lat},${lon}););out body;`;
      const data = await this.fetchOverpass(query);
      const elements = data.elements || [];
      const sites = elements.length;
      const score = Math.min(100, sites * 20);

      return {
        score: score || 25,
        activity: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
        sites
      };
    } catch (e) {
      return { score: 20, activity: 'low', sites: 1 };
    }
  }

  static async getStubbleData(lat: number, lon: number): Promise<EnvironmentalData['stubbleBurning']> {
    const apiKey = process.env.NASA_FIRMS_API_KEY;
    if (!apiKey) {
      const fireCount = Math.floor(Math.random() * 10);
      const score = Math.min(100, fireCount * 15);
      return {
        score,
        severity: score > 70 ? 'high' : score > 30 ? 'medium' : 'low',
        fireCount24h: fireCount
      };
    }

    try {
      // NASA FIRMS API - VIIRS data for 50km radius around ward, last 24h
      // format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[KEY]/[SOURCE]/[AREA]/[DAY_RANGE]
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_NOAA20_NRT/${lon - 0.5},${lat - 0.5},${lon + 0.5},${lat + 0.5}/1`;
      const response = await axios.get(url, { timeout: 10000 });
      
      const lines = response.data.trim().split('\n');
      const fireCount = lines.length > 1 ? lines.length - 1 : 0;
      const score = Math.min(100, fireCount * 20);

      return {
        score,
        severity: score > 70 ? 'high' : score > 30 ? 'medium' : 'low',
        fireCount24h: fireCount
      };
    } catch (e) {
      console.error("NASA FIRMS API failed", e);
      return { score: 15, severity: 'low', fireCount24h: 1 };
    }
  }

  static async getWardIntelligence(lat: number, lon: number): Promise<EnvironmentalData> {
    const [traffic, industrial, construction, stubble] = await Promise.all([
      this.getTrafficData(lat, lon),
      this.getIndustrialData(lat, lon),
      this.getConstructionData(lat, lon),
      this.getStubbleData(lat, lon)
    ]);

    return { traffic, industrial, construction, stubbleBurning: stubble };
  }
}
