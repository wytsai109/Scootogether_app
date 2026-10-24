/**
 * Scootogether 2.0 - Fleet & In-Memory Store Manager
 * 
 * Manages:
 * - Active scooter fleet with real-time GPS telemetry
 * - Taipei hotspot landmark registry
 * - Active trip registry and wallet balances
 */

import { calculateBearing } from './geoEngine.js';

export const TAIPEI_LANDMARKS = [
  { id: 'tpe_101', name: '台北101 (Taipei 101)', lat: 25.0339, lng: 121.5645, area: '信義區' },
  { id: 'tpe_main', name: '台北車站 (Taipei Main Station)', lat: 25.0478, lng: 121.5170, area: '中正區' },
  { id: 'ximen', name: '西門町商圈 (Ximending)', lat: 25.0422, lng: 121.5080, area: '萬華區' },
  { id: 'daan_park', name: '大安森林公園 (Daan Park)', lat: 25.0297, lng: 121.5354, area: '大安區' },
  { id: 'ntu', name: '國立台灣大學 (NTU Gongguan)', lat: 25.0173, lng: 121.5398, area: '大安/中正' },
  { id: 'songshan_apt', name: '松山機場 (Songshan Airport)', lat: 25.0601, lng: 121.5526, area: '松山區' },
  { id: 'neihu_tech', name: '內湖科技園區 (Neihu Tech Park)', lat: 25.0792, lng: 121.5721, area: '內湖區' },
  { id: 'huashan', name: '華山1914文創園區 (Huashan 1914)', lat: 25.0441, lng: 121.5294, area: '中正區' },
  { id: 'shilin', name: '士林夜市 (Shilin Night Market)', lat: 25.0888, lng: 121.5245, area: '士林區' },
  { id: 'arena', name: '台北小巨蛋 (Taipei Arena)', lat: 25.0519, lng: 121.5498, area: '松山區' }
];

const INITIAL_DRIVERS = [
  { id: 'DRV-101', name: '林志豪', phone: '0912-345-678', model: 'Gogoro SuperSport (電能黑)', plate: 'MKL-8821', rating: 4.96, completedTrips: 1240, status: 'AVAILABLE', lat: 25.0345, lng: 121.5620, heading: 45 },
  { id: 'DRV-102', name: '陳雅婷', phone: '0922-111-222', model: 'SYM JET SL 158 (極光白)', plate: 'NBL-3392', rating: 4.98, completedTrips: 890, status: 'AVAILABLE', lat: 25.0460, lng: 121.5195, heading: 90 },
  { id: 'DRV-103', name: '張家豪', phone: '0933-555-888', model: 'Kymco KRV MOTO (賽道灰)', plate: 'PKS-9102', rating: 4.91, completedTrips: 620, status: 'AVAILABLE', lat: 25.0410, lng: 25.0410 < 100 ? 121.5120 : 121.5120, heading: 180 },
  { id: 'DRV-104', name: '王威廉', phone: '0955-444-333', model: 'Yamaha Cygnus Gryphus 勁戰 (消光藍)', plate: 'RQQ-7788', rating: 4.95, completedTrips: 1530, status: 'AVAILABLE', lat: 25.0310, lng: 121.5370, heading: 270 },
  { id: 'DRV-105', name: '李冠宇', phone: '0966-777-999', model: 'Gogoro Delight (柔霧粉)', plate: 'EAA-2211', rating: 4.99, completedTrips: 410, status: 'AVAILABLE', lat: 25.0195, lng: 121.5410, heading: 120 },
  { id: 'DRV-106', name: '黃俊傑', phone: '0977-888-000', model: 'Kymco Many 125 (珍珠白)', plate: 'MMK-5566', rating: 4.89, completedTrips: 1100, status: 'AVAILABLE', lat: 25.0585, lng: 121.5510, heading: 330 },
  { id: 'DRV-107', name: '蔡欣怡', phone: '0918-223-344', model: 'SYM DRGBT 158 (玄武黑)', plate: 'TTR-6655', rating: 4.97, completedTrips: 780, status: 'AVAILABLE', lat: 25.0760, lng: 121.5690, heading: 60 },
  { id: 'DRV-108', name: '吳宗憲', phone: '0928-334-455', model: 'Gogoro CrossOver (越野沙)', plate: 'EEV-9988', rating: 4.92, completedTrips: 950, status: 'AVAILABLE', lat: 25.0435, lng: 121.5310, heading: 210 },
  { id: 'DRV-109', name: '許佩珊', phone: '0938-445-566', model: 'Yamaha Force 2.0 (暗夜綠)', plate: 'YZF-1234', rating: 4.94, completedTrips: 840, status: 'AVAILABLE', lat: 25.0505, lng: 121.5470, heading: 15 },
  { id: 'DRV-110', name: '鄭大為', phone: '0958-556-677', model: 'Aeon Ai-1 Sport (曜石黑)', plate: 'AI-7722', rating: 4.90, completedTrips: 530, status: 'AVAILABLE', lat: 25.0380, lng: 121.5550, heading: 195 },
  { id: 'DRV-111', name: '周子揚', phone: '0968-667-788', model: 'Honda ADV 160 (銀灰旗艦)', plate: 'HND-5201', rating: 4.98, completedTrips: 1350, status: 'AVAILABLE', lat: 25.0440, lng: 121.5140, heading: 135 },
  { id: 'DRV-112', name: '劉恩齊', phone: '0978-778-899', model: 'PGO Spring 125 (奶油杏)', plate: 'PGO-8866', rating: 4.93, completedTrips: 670, status: 'AVAILABLE', lat: 25.0250, lng: 121.5320, heading: 285 }
];

class FleetManager {
  constructor() {
    this.drivers = INITIAL_DRIVERS.map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      model: d.model,
      plate: d.plate,
      rating: d.rating,
      completedTrips: d.completedTrips,
      status: d.status,
      location: { lat: d.lat, lng: d.lng },
      heading: d.heading,
      velocityKmH: 26 + Math.floor(Math.random() * 8)
    }));

    this.trips = new Map();
    this.wallets = new Map([
      ['USER_PASSENGER', { balanceNTD: 1250, currency: 'TWD', totalSavedNTD: 480, totalCarbonOffsetGrams: 3240 }],
      ['DRV-101', { balanceNTD: 8640, currency: 'TWD', todayEarningsNTD: 1820 }],
      ['SYSTEM_POOL', { balanceNTD: 152000, currency: 'TWD' }]
    ]);

    this.stats = {
      totalDispatchedTrips: 4280,
      activePoolingMatches: 18,
      totalCarbonSavedKg: 582.4,
      avgPickupMins: 2.8
    };

    // Start background wander simulation
    this.startWanderLoop();
  }

  getAllDrivers() {
    return this.drivers;
  }

  getDriverById(id) {
    return this.drivers.find(d => d.id === id);
  }

  setDriverStatus(id, status) {
    const driver = this.getDriverById(id);
    if (driver) {
      driver.status = status;
      return true;
    }
    return false;
  }

  createTrip(tripData) {
    const tripId = `TRIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
    const trip = {
      id: tripId,
      status: 'SEARCHING',
      createdAt: new Date().toISOString(),
      timeline: [{ status: 'SEARCHING', timestamp: new Date().toISOString() }],
      ...tripData
    };
    this.trips.set(tripId, trip);
    this.stats.totalDispatchedTrips++;
    if (trip.mode === 'POOLING') {
      this.stats.activePoolingMatches++;
      this.stats.totalCarbonSavedKg += (trip.estimatedFare.carbonSavedGrams || 0) / 1000;
    }
    return trip;
  }

  getTrip(tripId) {
    return this.trips.get(tripId);
  }

  getWallet(userId) {
    if (!this.wallets.has(userId)) {
      this.wallets.set(userId, { balanceNTD: 1000, currency: 'TWD', totalSavedNTD: 0, totalCarbonOffsetGrams: 0 });
    }
    return this.wallets.get(userId);
  }

  topupWallet(userId, amount) {
    const wallet = this.getWallet(userId);
    wallet.balanceNTD += Number(amount);
    return wallet;
  }

  chargeTrip(passengerId, driverId, fareNTD, savingsNTD, carbonGrams) {
    const pWallet = this.getWallet(passengerId);
    const dWallet = this.getWallet(driverId);

    pWallet.balanceNTD = Math.max(0, pWallet.balanceNTD - fareNTD);
    pWallet.totalSavedNTD += (savingsNTD || 0);
    pWallet.totalCarbonOffsetGrams += (carbonGrams || 0);

    const driverShare = Math.round(fareNTD * 0.85); // 85% driver take rate
    dWallet.balanceNTD += driverShare;
    dWallet.todayEarningsNTD = (dWallet.todayEarningsNTD || 0) + driverShare;

    return { pWallet, dWallet };
  }

  /**
   * Moves simulated drivers slightly along their headings in Taipei
   */
  startWanderLoop() {
    setInterval(() => {
      this.drivers.forEach(driver => {
        if (driver.status === 'AVAILABLE') {
          // Add small jitter to latitude and longitude (~15-30 meters per tick)
          const angleRad = (driver.heading * Math.PI) / 180;
          const deltaLat = Math.cos(angleRad) * 0.00015;
          const deltaLng = Math.sin(angleRad) * 0.00018;

          driver.location.lat += deltaLat;
          driver.location.lng += deltaLng;

          // Gentle random heading wander
          driver.heading = (driver.heading + (Math.random() * 20 - 10) + 360) % 360;

          // Boundary clamp to Taipei Metropolitan area (25.01 - 25.09, 121.50 - 121.58)
          if (driver.location.lat < 25.010) driver.heading = 45;
          if (driver.location.lat > 25.090) driver.heading = 225;
          if (driver.location.lng < 121.500) driver.heading = 90;
          if (driver.location.lng > 121.580) driver.heading = 270;
        }
      });
    }, 1500);
  }
}

export const fleetManager = new FleetManager();
