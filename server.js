/**
 * Scootogether 2.0 - Core Dispatch Server & Real-time WebSockets
 * 
 * Powered by Node.js 22 (ES Modules), Express RESTful APIs & WebSocket (ws)
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { haversineDistance, findNearbyDrivers, estimateFare } from './services/geoEngine.js';
import { TripStateMachine, TripStatus } from './services/tripFsm.js';
import { fleetManager, TAIPEI_LANDMARKS } from './services/fleetManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Push periodic real-time GPS fleet updates
setInterval(() => {
  broadcast({
    type: 'FLEET_UPDATE',
    timestamp: new Date().toISOString(),
    fleet: fleetManager.getAllDrivers()
  });
}, 1500);

/* ==========================================================================
   RESTful API Endpoints
   ========================================================================== */

// 1. Health check & System info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Scootogether 2.0 Dispatch Server',
    runtime: `Node.js ${process.version}`,
    activeDrivers: fleetManager.getAllDrivers().filter(d => d.status === 'AVAILABLE').length,
    activeWsConnections: wss.clients.size,
    timestamp: new Date().toISOString()
  });
});

// 2. Taipei Landmark registry
app.get('/api/landmarks', (req, res) => {
  res.json({ success: true, landmarks: TAIPEI_LANDMARKS });
});

// 3. Full fleet status
app.get('/api/fleet', (req, res) => {
  res.json({
    success: true,
    totalCount: fleetManager.getAllDrivers().length,
    drivers: fleetManager.getAllDrivers()
  });
});

// 4. Nearby Drivers by Spatial Radius Search
app.get('/api/drivers/nearby', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 3.5;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, message: 'Invalid lat/lng parameters' });
  }

  const nearby = findNearbyDrivers(lat, lng, fleetManager.getAllDrivers(), radius);
  res.json({
    success: true,
    userLocation: { lat, lng },
    searchRadiusKm: radius,
    matchedCount: nearby.length,
    drivers: nearby
  });
});

// 5. Dynamic Fare & Pooling Estimation
app.post('/api/rides/estimate', (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.body;

  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ success: false, message: 'Origin and destination coordinates are required' });
  }

  const soloEstimate = estimateFare(originLat, originLng, destLat, destLng, false);
  const poolingEstimate = estimateFare(originLat, originLng, destLat, destLng, true);

  res.json({
    success: true,
    solo: soloEstimate,
    pooling: poolingEstimate,
    recommended: 'POOLING',
    environmentalImpact: {
      treeAbsorptionEquivalentDays: Math.round(poolingEstimate.carbonSavedGrams / 35),
      trafficCongestionReductionPercent: 40
    }
  });
});

// 6. Request a New Ride
app.post('/api/rides/request', (req, res) => {
  const {
    passengerId = 'USER_PASSENGER',
    passengerName = '陳品妍 (You)',
    passengerPhone = '0988-777-666',
    origin,
    destination,
    mode = 'POOLING'
  } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ success: false, message: 'Origin and destination are required' });
  }

  const isPooling = mode === 'POOLING';
  const estimate = estimateFare(origin.lat, origin.lng, destination.lat, destination.lng, isPooling);

  const trip = fleetManager.createTrip({
    passengerId,
    passengerName,
    passengerPhone,
    origin,
    destination,
    mode,
    estimatedFare: estimate
  });

  // Broadcast dispatch request to all driver terminals
  broadcast({
    type: 'NEW_RIDE_REQUEST',
    trip
  });

  res.json({
    success: true,
    message: 'Ride request dispatched to nearby drivers',
    trip
  });
});

// 7. Driver Accepts Trip
app.post('/api/rides/:id/accept', (req, res) => {
  const tripId = req.params.id;
  const { driverId } = req.body;

  const trip = fleetManager.getTrip(tripId);
  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  const driver = fleetManager.getDriverById(driverId);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }

  try {
    const fsm = new TripStateMachine(trip);
    fsm.transition(TripStatus.MATCHED, { driverId, driverName: driver.name, vehicle: driver.model });
    fleetManager.setDriverStatus(driverId, 'ON_TRIP');

    broadcast({
      type: 'RIDE_MATCHED',
      trip,
      driver
    });

    res.json({ success: true, trip, driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 8. Progress Trip Status (Arrived -> In Transit -> Completed)
app.post('/api/rides/:id/step', (req, res) => {
  const tripId = req.params.id;
  const { nextStatus } = req.body;

  const trip = fleetManager.getTrip(tripId);
  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  try {
    const fsm = new TripStateMachine(trip);
    fsm.transition(nextStatus);

    if (nextStatus === TripStatus.COMPLETED) {
      if (trip.driverId) {
        fleetManager.setDriverStatus(trip.driverId, 'AVAILABLE');
      }
      fleetManager.chargeTrip(
        trip.passengerId,
        trip.driverId,
        trip.estimatedFare.fareNTD,
        trip.estimatedFare.savingsNTD,
        trip.estimatedFare.carbonSavedGrams
      );
    }

    broadcast({
      type: 'RIDE_STATUS_UPDATE',
      trip
    });

    res.json({ success: true, trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 9. Cancel Trip
app.post('/api/rides/:id/cancel', (req, res) => {
  const tripId = req.params.id;
  const { reason = 'User requested cancellation' } = req.body;

  const trip = fleetManager.getTrip(tripId);
  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  try {
    const fsm = new TripStateMachine(trip);
    fsm.transition(TripStatus.CANCELLED, { reason });
    if (trip.driverId) {
      fleetManager.setDriverStatus(trip.driverId, 'AVAILABLE');
    }

    broadcast({
      type: 'RIDE_STATUS_UPDATE',
      trip
    });

    res.json({ success: true, trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 10. Digital Wallet
app.get('/api/wallet/balance', (req, res) => {
  const userId = req.query.userId || 'USER_PASSENGER';
  const wallet = fleetManager.getWallet(userId);
  res.json({ success: true, userId, wallet });
});

app.post('/api/wallet/topup', (req, res) => {
  const { userId = 'USER_PASSENGER', amount = 500 } = req.body;
  const wallet = fleetManager.topupWallet(userId, amount);
  res.json({ success: true, message: `Successfully topped up $${amount} NTD`, wallet });
});

// 11. System KPI & ESG Stats Overview
app.get('/api/stats/overview', (req, res) => {
  const allDrivers = fleetManager.getAllDrivers();
  res.json({
    success: true,
    fleet: {
      total: allDrivers.length,
      available: allDrivers.filter(d => d.status === 'AVAILABLE').length,
      onTrip: allDrivers.filter(d => d.status === 'ON_TRIP').length
    },
    metrics: fleetManager.stats,
    esg: {
      treesEquivalent: Math.round(fleetManager.stats.totalCarbonSavedKg / 12),
      fuelSavedLiters: Math.round(fleetManager.stats.totalCarbonSavedKg * 0.43)
    }
  });
});

/* ==========================================================================
   WebSocket Connection Handler
   ========================================================================== */
wss.on('connection', (ws) => {
  // Send immediate initial handshake
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Connected to Scootogether 2.0 Dispatch WebSocket Server',
    landmarks: TAIPEI_LANDMARKS,
    fleet: fleetManager.getAllDrivers()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
      }
    } catch (e) {
      // ignore malformed ws messages
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛵 Scootogether 2.0 Dispatch Server is Online!`);
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Server: ws://localhost:${PORT}`);
  console.log(`🚀 Node.js Runtime: ${process.version}`);
  console.log(`=======================================================`);
});
