/**
 * Scootogether 2.0 - Client Controller & Real-Time Canvas Dispatch Map
 */

// Application State
const state = {
  activeTab: 'tab-fleet',
  landmarks: [],
  fleet: [],
  activeTrip: null,
  wallet: { balanceNTD: 1250 },
  selectedMode: 'POOLING',
  heatmapEnabled: false,
  driverOnline: true,
  currentIncomingTrip: null,
  countdownInterval: null,
  ws: null
};

// Canvas Map Coordinate Mapping
// Taipei Bounds: Lat [25.010, 25.095], Lng [121.500, 121.585]
const MAP_BOUNDS = {
  minLat: 25.010,
  maxLat: 25.095,
  minLng: 121.500,
  maxLng: 121.585
};

function latLngToCanvas(lat, lng, width, height) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
  const y = height - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
  return { x, y };
}

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initWebSocket();
  initMapCanvas();
  initPassengerForm();
  initDriverHUD();
  initApiExplorer();
  fetchInitialData();
});

// Tab Switcher
function initTabs() {
  const tabs = document.querySelectorAll('.role-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
      state.activeTab = targetId;

      if (targetId === 'tab-fleet') {
        resizeCanvas();
        renderMap();
      }
    });
  });
}

// Fetch Initial Landmarks & Fleet
async function fetchInitialData() {
  try {
    const res = await fetch('/api/landmarks');
    const data = await res.json();
    if (data.success) {
      state.landmarks = data.landmarks;
      populateLandmarkSelects();
      updateFareEstimate();
    }

    const fleetRes = await fetch('/api/fleet');
    const fleetData = await fleetRes.json();
    if (fleetData.success) {
      state.fleet = fleetData.drivers;
      updateFleetSidebar();
      renderMap();
    }

    const walletRes = await fetch('/api/wallet/balance');
    const walletData = await walletRes.json();
    if (walletData.success) {
      state.wallet = walletData.wallet;
      updateWalletUI();
    }
  } catch (err) {
    console.warn('Initial data fetch error:', err);
  }
}

/* ==========================================================================
   WebSocket Real-time Client
   ========================================================================== */
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  const statusEl = document.getElementById('wsStatusText');

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    if (statusEl) statusEl.textContent = 'WS 即時同步中 (Online)';
  };

  state.ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWsMessage(msg);
    } catch (e) {
      console.error('WS parse error:', e);
    }
  };

  state.ws.onclose = () => {
    if (statusEl) statusEl.textContent = 'WS 重新連線中...';
    setTimeout(initWebSocket, 2500);
  };
}

function handleWsMessage(msg) {
  switch (msg.type) {
    case 'FLEET_UPDATE':
      state.fleet = msg.fleet;
      updateFleetSidebar();
      renderMap();
      break;

    case 'NEW_RIDE_REQUEST':
      // If driver is online, pop up dispatch countdown
      if (state.driverOnline) {
        showIncomingDispatchAlert(msg.trip);
      }
      break;

    case 'RIDE_MATCHED':
      if (state.activeTrip && state.activeTrip.id === msg.trip.id) {
        state.activeTrip = msg.trip;
        updateTripUI();
      }
      break;

    case 'RIDE_STATUS_UPDATE':
      if (state.activeTrip && state.activeTrip.id === msg.trip.id) {
        state.activeTrip = msg.trip;
        updateTripUI();
      }
      break;
  }
}

/* ==========================================================================
   Canvas Dynamic Vector Dispatch Map
   ========================================================================== */
let canvas, ctx;

function initMapCanvas() {
  canvas = document.getElementById('fleetCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const toggle = document.getElementById('heatmapToggle');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      state.heatmapEnabled = e.target.checked;
      renderMap();
    });
  }

  const centerBtn = document.getElementById('centerMapBtn');
  if (centerBtn) {
    centerBtn.addEventListener('click', () => {
      renderMap();
    });
  }
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 960;
  canvas.height = rect.height * window.devicePixelRatio || 640;
  renderMap();
}

function renderMap() {
  if (!canvas || !ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  // Clear background
  ctx.fillStyle = '#080d18';
  ctx.fillRect(0, 0, w, h);

  // 1. Draw Cyber Grid
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 40 * (window.devicePixelRatio || 1);
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 2. Draw Simulated Taipei Road Arteries (Tamsui River & Key Boulevards)
  drawTaipeiRoadNetwork(w, h);

  // 3. Draw Heatmap (if enabled)
  if (state.heatmapEnabled) {
    drawDemandHeatmap(w, h);
  }

  // 4. Draw Active Trip Route Corridor (if any)
  if (state.activeTrip && state.activeTrip.origin && state.activeTrip.destination) {
    drawActiveTripCorridor(w, h);
  }

  // 5. Draw Taipei Landmark Points
  state.landmarks.forEach(lm => {
    const pt = latLngToCanvas(lm.lat, lm.lng, w, h);
    // Outer glow
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fill();

    // Core point
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `${10 * (window.devicePixelRatio || 1)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(lm.name.split(' (')[0], pt.x + 8, pt.y + 3);
  });

  // 6. Draw Moving Scooters
  state.fleet.forEach(driver => {
    const pt = latLngToCanvas(driver.location.lat, driver.location.lng, w, h);
    const isAvailable = driver.status === 'AVAILABLE';
    const color = isAvailable ? '#00ffa3' : '#ff7f24';

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate((driver.heading * Math.PI) / 180);

    // Pulse ring
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = isAvailable ? 'rgba(0, 255, 163, 0.15)' : 'rgba(255, 127, 36, 0.15)';
    ctx.fill();

    // Arrow / Vehicle body
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  });
}

function drawTaipeiRoadNetwork(w, h) {
  // Main Arteries: Zhongxiao E/W Rd, Xinyi Rd, Dunhua Rd, Fuxing Rd, Civic Blvd
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2 * (window.devicePixelRatio || 1);

  const mainRoads = [
    // Zhongxiao Corridor (West to East)
    [{ lat: 25.042, lng: 121.505 }, { lat: 25.048, lng: 121.580 }],
    // Xinyi Corridor
    [{ lat: 25.033, lng: 121.515 }, { lat: 25.034, lng: 121.580 }],
    // Dunhua Corridor (North to South)
    [{ lat: 25.060, lng: 121.549 }, { lat: 25.018, lng: 121.549 }],
    // Fuxing Corridor
    [{ lat: 25.060, lng: 121.543 }, { lat: 25.020, lng: 121.543 }],
    // Keelung Road Express
    [{ lat: 25.055, lng: 121.565 }, { lat: 25.015, lng: 121.535 }]
  ];

  mainRoads.forEach(road => {
    const p1 = latLngToCanvas(road[0].lat, road[0].lng, w, h);
    const p2 = latLngToCanvas(road[1].lat, road[1].lng, w, h);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });
}

function drawDemandHeatmap(w, h) {
  const hotAreas = [
    { lat: 25.0339, lng: 121.5645, r: 60, intensity: 0.35 }, // Taipei 101
    { lat: 25.0478, lng: 121.5170, r: 75, intensity: 0.40 }, // Taipei Main
    { lat: 25.0173, lng: 121.5398, r: 50, intensity: 0.30 }, // NTU
    { lat: 25.0792, lng: 121.5721, r: 65, intensity: 0.35 }  // Neihu Tech
  ];

  hotAreas.forEach(area => {
    const pt = latLngToCanvas(area.lat, area.lng, w, h);
    const grad = ctx.createRadialGradient(pt.x, pt.y, 5, pt.x, pt.y, area.r * (window.devicePixelRatio || 1));
    grad.addColorStop(0, 'rgba(255, 51, 102, 0.45)');
    grad.addColorStop(0.5, 'rgba(255, 127, 36, 0.25)');
    grad.addColorStop(1, 'rgba(255, 204, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, area.r * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawActiveTripCorridor(w, h) {
  const trip = state.activeTrip;
  const pOrigin = latLngToCanvas(trip.origin.lat, trip.origin.lng, w, h);
  const pDest = latLngToCanvas(trip.destination.lat, trip.destination.lng, w, h);

  // Corridor line
  ctx.save();
  ctx.strokeStyle = '#ff4785';
  ctx.lineWidth = 3 * (window.devicePixelRatio || 1);
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(pOrigin.x, pOrigin.y);
  ctx.lineTo(pDest.x, pDest.y);
  ctx.stroke();
  ctx.restore();

  // Origin Marker
  ctx.beginPath();
  ctx.arc(pOrigin.x, pOrigin.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#00ffa3';
  ctx.shadowColor = '#00ffa3';
  ctx.shadowBlur = 10;
  ctx.fill();

  // Destination Marker
  ctx.beginPath();
  ctx.arc(pDest.x, pDest.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ff4785';
  ctx.shadowColor = '#ff4785';
  ctx.shadowBlur = 10;
  ctx.fill();
}

function updateFleetSidebar() {
  const totalEl = document.getElementById('metricTotalFleet');
  const countBadge = document.getElementById('fleetCountBadge');
  const scrollList = document.getElementById('driverScrollList');

  if (totalEl) totalEl.textContent = state.fleet.length;
  if (countBadge) countBadge.textContent = `${state.fleet.filter(d => d.status === 'AVAILABLE').length} 台空車巡弋`;

  if (!scrollList) return;
  scrollList.innerHTML = state.fleet.map(d => {
    const isAvail = d.status === 'AVAILABLE';
    return `
      <div class="fleet-row-item">
        <div class="fleet-driver-info">
          <span class="fleet-driver-avatar">🛵</span>
          <div>
            <div class="fleet-driver-name">${d.name} <span style="font-size:11px;color:#ffcc00;">★${d.rating}</span></div>
            <div class="fleet-driver-model">${d.model.split(' (')[0]} • ${d.plate}</div>
          </div>
        </div>
        <span class="fleet-status-pill ${isAvail ? 'available' : 'ontrip'}">
          ${isAvail ? '● 可接單' : '▲ 載客中'}
        </span>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Passenger Booking Form Logic
   ========================================================================== */
function initPassengerForm() {
  const originSelect = document.getElementById('passengerOrigin');
  const destSelect = document.getElementById('passengerDest');
  const modePooling = document.getElementById('modePooling');
  const modeSolo = document.getElementById('modeSolo');
  const btnRequest = document.getElementById('btnRequestRide');
  const btnCancel = document.getElementById('btnCancelTrip');

  if (originSelect && destSelect) {
    originSelect.addEventListener('change', updateFareEstimate);
    destSelect.addEventListener('change', updateFareEstimate);
  }

  if (modePooling && modeSolo) {
    modePooling.addEventListener('click', () => {
      modePooling.classList.add('selected');
      modeSolo.classList.remove('selected');
      state.selectedMode = 'POOLING';
      updateFareEstimate();
    });

    modeSolo.addEventListener('click', () => {
      modeSolo.classList.add('selected');
      modePooling.classList.remove('selected');
      state.selectedMode = 'SOLO';
      updateFareEstimate();
    });
  }

  if (btnRequest) {
    btnRequest.addEventListener('click', handleRequestRide);
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', handleCancelTrip);
  }
}

function populateLandmarkSelects() {
  const originSelect = document.getElementById('passengerOrigin');
  const destSelect = document.getElementById('passengerDest');
  if (!originSelect || !destSelect) return;

  const optionsHtml = state.landmarks.map((lm, idx) => 
    `<option value="${lm.id}">${lm.name} (${lm.area})</option>`
  ).join('');

  originSelect.innerHTML = optionsHtml;
  destSelect.innerHTML = optionsHtml;

  // Set default: Taipei Main Station -> Taipei 101
  originSelect.value = 'tpe_main';
  destSelect.value = 'tpe_101';
}

async function updateFareEstimate() {
  const originSelect = document.getElementById('passengerOrigin');
  const destSelect = document.getElementById('passengerDest');
  if (!originSelect || !destSelect || state.landmarks.length === 0) return;

  const originLm = state.landmarks.find(l => l.id === originSelect.value);
  const destLm = state.landmarks.find(l => l.id === destSelect.value);
  if (!originLm || !destLm) return;

  try {
    const res = await fetch('/api/rides/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat: originLm.lat,
        originLng: originLm.lng,
        destLat: destLm.lat,
        destLng: destLm.lng
      })
    });
    const data = await res.json();
    if (data.success) {
      const pricePoolEl = document.getElementById('pricePooling');
      const priceOrigEl = document.getElementById('priceOriginal');
      const priceSoloEl = document.getElementById('priceSolo');
      const ecoEl = document.getElementById('ecoEstimate');

      if (pricePoolEl) pricePoolEl.innerHTML = `$${data.pooling.fareNTD} <span class="curr">NTD</span>`;
      if (priceOrigEl) priceOrigEl.textContent = `$${data.pooling.originalFareNTD}`;
      if (priceSoloEl) priceSoloEl.innerHTML = `$${data.solo.fareNTD} <span class="curr">NTD</span>`;
      if (ecoEl) ecoEl.textContent = `🍃 減少 ${data.pooling.carbonSavedGrams}g CO₂ 排放 (${data.pooling.distanceKm} km)`;

      // Fetch nearby drivers
      fetchNearbyDriversPreview(originLm.lat, originLm.lng);
    }
  } catch (err) {
    console.warn('Fare estimate error:', err);
  }
}

async function fetchNearbyDriversPreview(lat, lng) {
  try {
    const res = await fetch(`/api/drivers/nearby?lat=${lat}&lng=${lng}&radius=3.5`);
    const data = await res.json();
    if (data.success) {
      const countEl = document.getElementById('nearbyCountText');
      const pillsEl = document.getElementById('nearbyPills');

      if (countEl) countEl.textContent = `方圓 3.5km 內偵測到 ${data.matchedCount} 台可用機車`;
      if (pillsEl) {
        pillsEl.innerHTML = data.drivers.slice(0, 3).map(d => `
          <span class="nearby-driver-tag">
            🛵 ${d.name} (${d.distanceKm} km • 約 ${d.etaMinutes} 分)
          </span>
        `).join('');
      }
    }
  } catch (e) {
    // ignore
  }
}

async function handleRequestRide() {
  const originSelect = document.getElementById('passengerOrigin');
  const destSelect = document.getElementById('passengerDest');
  const btn = document.getElementById('btnRequestRide');

  const originLm = state.landmarks.find(l => l.id === originSelect.value);
  const destLm = state.landmarks.find(l => l.id === destSelect.value);
  if (!originLm || !destLm) return;

  btn.disabled = true;
  btn.innerHTML = `<span class="pulse-dot"></span> 秒級派單廣播中...`;

  try {
    const res = await fetch('/api/rides/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: originLm,
        destination: destLm,
        mode: state.selectedMode
      })
    });
    const data = await res.json();
    if (data.success) {
      state.activeTrip = data.trip;
      updateTripUI();
      renderMap();

      // Auto-switch view to tracking
      document.getElementById('tripEmptyState').style.display = 'none';
      document.getElementById('tripActiveState').style.display = 'block';
    }
  } catch (err) {
    alert('呼叫機車失敗: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '一鍵呼叫機車 (Request Ride)';
  }
}

async function handleCancelTrip() {
  if (!state.activeTrip) return;
  try {
    const res = await fetch(`/api/rides/${state.activeTrip.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Passenger cancelled' })
    });
    const data = await res.json();
    if (data.success) {
      state.activeTrip = null;
      document.getElementById('tripEmptyState').style.display = 'flex';
      document.getElementById('tripActiveState').style.display = 'none';
      renderMap();
    }
  } catch (e) {
    alert('取消行程失敗');
  }
}

function updateTripUI() {
  const trip = state.activeTrip;
  if (!trip) return;

  document.getElementById('activeTripId').textContent = trip.id;
  document.getElementById('activeTripMode').textContent = trip.mode === 'POOLING' ? '智慧共乘 (Smart Pooling)' : '疾速專車 (Solo Ride)';
  document.getElementById('activeTripFare').textContent = `$${trip.estimatedFare.fareNTD} NTD`;

  // Status Stepper
  const steps = ['Searching', 'Matched', 'Arrived', 'InTransit', 'Completed'];
  const statusIndexMap = {
    'SEARCHING': 0,
    'MATCHED': 1,
    'ARRIVED': 2,
    'IN_TRANSIT': 3,
    'COMPLETED': 4
  };

  const currIdx = statusIndexMap[trip.status] !== undefined ? statusIndexMap[trip.status] : 0;

  steps.forEach((name, idx) => {
    const item = document.getElementById(`step${name}`);
    if (item) {
      item.classList.remove('active', 'completed');
      if (idx === currIdx) item.classList.add('active');
      else if (idx < currIdx) item.classList.add('completed');
    }

    if (idx >= 1 && idx <= 4) {
      const line = document.getElementById(`line${idx}`);
      if (line) {
        if (idx <= currIdx) line.classList.add('filled');
        else line.classList.remove('filled');
      }
    }
  });

  const badge = document.getElementById('tripStatusBadge');
  if (badge) {
    badge.textContent = `狀態: ${trip.status}`;
    badge.className = 'badge ' + (trip.status === 'COMPLETED' ? 'badge-green' : 'badge-cyan');
  }

  // Matched Driver info
  const driverCard = document.getElementById('matchedDriverCard');
  if (trip.driverId && driverCard) {
    const driver = state.fleet.find(d => d.id === trip.driverId) || { name: '林志豪', rating: 4.96, model: 'Gogoro SuperSport', plate: 'MKL-8821' };
    driverCard.style.display = 'flex';
    document.getElementById('driverCardName').textContent = driver.name;
    document.getElementById('driverCardRating').textContent = `★ ${driver.rating}`;
    document.getElementById('driverCardModel').textContent = driver.model;
    document.getElementById('driverCardPlate').textContent = `車牌: ${driver.plate}`;
  }

  // Update wallet if trip is completed
  if (trip.status === 'COMPLETED') {
    fetchInitialData();
  }
}

/* ==========================================================================
   Driver HUD Terminal Logic
   ========================================================================== */
function initDriverHUD() {
  const dutyBtn = document.getElementById('driverDutyBtn');
  const btnAccept = document.getElementById('btnAcceptRide');
  const btnDecline = document.getElementById('btnDeclineRide');

  const btnArrived = document.getElementById('btnDriverArrived');
  const btnStartTrip = document.getElementById('btnDriverStartTrip');
  const btnCompleteTrip = document.getElementById('btnDriverCompleteTrip');

  if (dutyBtn) {
    dutyBtn.addEventListener('click', () => {
      state.driverOnline = !state.driverOnline;
      dutyBtn.textContent = state.driverOnline ? '● 線上接單中' : '○ 休息離線中';
      dutyBtn.className = 'btn btn-sm ' + (state.driverOnline ? 'btn-green' : 'btn-ghost');
    });
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', handleDriverAccept);
  }

  if (btnDecline) {
    btnDecline.addEventListener('click', () => {
      hideIncomingDispatchAlert();
    });
  }

  if (btnArrived) {
    btnArrived.addEventListener('click', () => stepDriverTrip('ARRIVED'));
  }
  if (btnStartTrip) {
    btnStartTrip.addEventListener('click', () => stepDriverTrip('IN_TRANSIT'));
  }
  if (btnCompleteTrip) {
    btnCompleteTrip.addEventListener('click', () => stepDriverTrip('COMPLETED'));
  }
}

function showIncomingDispatchAlert(trip) {
  state.currentIncomingTrip = trip;
  const box = document.getElementById('incomingDispatchBox');
  if (!box) return;

  document.getElementById('incomingRouteTitle').textContent = `${trip.origin.name.split(' (')[0]} ➔ ${trip.destination.name.split(' (')[0]}`;
  document.getElementById('incomingPassenger').textContent = trip.passengerName || '陳品妍';
  document.getElementById('incomingDistance').textContent = `${trip.estimatedFare.distanceKm} km (約 ${trip.estimatedFare.durationMinutes} 分鐘)`;
  document.getElementById('incomingMode').textContent = trip.mode === 'POOLING' ? '智慧共乘' : '疾速專車';
  const driverPayout = Math.round(trip.estimatedFare.fareNTD * 0.85);
  document.getElementById('incomingEarnings').textContent = `$${driverPayout} NTD`;

  box.style.display = 'block';

  // 15s Countdown
  let seconds = 15;
  const circle = document.getElementById('countdownSec');
  circle.textContent = `${seconds}s`;

  clearInterval(state.countdownInterval);
  state.countdownInterval = setInterval(() => {
    seconds--;
    circle.textContent = `${seconds}s`;
    if (seconds <= 0) {
      clearInterval(state.countdownInterval);
      hideIncomingDispatchAlert();
    }
  }, 1000);
}

function hideIncomingDispatchAlert() {
  clearInterval(state.countdownInterval);
  const box = document.getElementById('incomingDispatchBox');
  if (box) box.style.display = 'none';
  state.currentIncomingTrip = null;
}

async function handleDriverAccept() {
  if (!state.currentIncomingTrip) return;
  const tripId = state.currentIncomingTrip.id;
  hideIncomingDispatchAlert();

  try {
    const res = await fetch(`/api/rides/${tripId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: 'DRV-101' })
    });
    const data = await res.json();
    if (data.success) {
      state.activeTrip = data.trip;
      updateTripUI();

      // Show Driver Trip Controller
      const controller = document.getElementById('driverTripController');
      if (controller) controller.style.display = 'block';
      document.getElementById('driverTripStatus').textContent = '已接單 • 前往接客中';
    }
  } catch (err) {
    alert('接單失敗: ' + err.message);
  }
}

async function stepDriverTrip(nextStatus) {
  if (!state.activeTrip) return;
  try {
    const res = await fetch(`/api/rides/${state.activeTrip.id}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextStatus })
    });
    const data = await res.json();
    if (data.success) {
      state.activeTrip = data.trip;
      updateTripUI();

      const btnArrived = document.getElementById('btnDriverArrived');
      const btnStart = document.getElementById('btnDriverStartTrip');
      const btnComplete = document.getElementById('btnDriverCompleteTrip');

      if (nextStatus === 'ARRIVED') {
        btnArrived.disabled = true;
        btnStart.disabled = false;
        document.getElementById('driverTripStatus').textContent = '已抵達上車點 • 等待乘客';
      } else if (nextStatus === 'IN_TRANSIT') {
        btnStart.disabled = true;
        btnComplete.disabled = false;
        document.getElementById('driverTripStatus').textContent = '載送行駛中 • 導航中';
      } else if (nextStatus === 'COMPLETED') {
        btnComplete.disabled = true;
        document.getElementById('driverTripStatus').textContent = '行程圓滿完成 • 車資已入帳';
        setTimeout(() => {
          document.getElementById('driverTripController').style.display = 'none';
          btnArrived.disabled = false;
          btnStart.disabled = true;
          btnComplete.disabled = true;
        }, 3000);
      }
    }
  } catch (e) {
    alert('狀態推進失敗');
  }
}

function updateWalletUI() {
  const pill = document.getElementById('navWalletBalance');
  if (pill && state.wallet) {
    pill.textContent = `$${state.wallet.balanceNTD.toLocaleString()} NTD`;
  }
}

/* ==========================================================================
   API Interactive Explorer Logic
   ========================================================================== */
const API_SPECS = {
  fleet: {
    method: 'GET',
    url: '/api/fleet',
    desc: '取得當前台北市所有在線機車車隊的即時 GPS 座標、車型、車牌、司機評分與在線狀態。',
    hasBody: false
  },
  nearby: {
    method: 'GET',
    url: '/api/drivers/nearby?lat=25.0339&lng=121.5645&radius=3.5',
    desc: '利用 Haversine 球面空間索引演算法，以指定經緯度（如台北101）為圓心，快搜半徑 3.5 公里內的可用機車。',
    hasBody: false
  },
  estimate: {
    method: 'POST',
    url: '/api/rides/estimate',
    desc: '即時估算起訖點之「疾速專車」與「智慧共乘」車資、路徑公里數、預計行駛時間與碳排放減量。',
    hasBody: true,
    defaultBody: JSON.stringify({
      originLat: 25.0478,
      originLng: 121.5170,
      destLat: 25.0339,
      destLng: 121.5645
    }, null, 2)
  },
  request: {
    method: 'POST',
    url: '/api/rides/request',
    desc: '發起新叫車訂單，系統建立 Trip FSM 狀態並即時透過 WebSocket 向周遭所有司機終端推播派單雷達。',
    hasBody: true,
    defaultBody: JSON.stringify({
      passengerName: '陳品妍 (You)',
      origin: { name: '台北車站', lat: 25.0478, lng: 121.5170 },
      destination: { name: '台北101', lat: 25.0339, lng: 121.5645 },
      mode: 'POOLING'
    }, null, 2)
  },
  wallet: {
    method: 'GET',
    url: '/api/wallet/balance?userId=USER_PASSENGER',
    desc: '查詢用戶電子錢包餘額、歷史透過共乘節省之車資總額及累積減碳克數。',
    hasBody: false
  },
  stats: {
    method: 'GET',
    url: '/api/stats/overview',
    desc: '取得全城調度總覽數據（運力比、累計共乘次數、碳減排總公斤數及 ESG 等效樹木換算）。',
    hasBody: false
  }
};

let currentEndpointKey = 'fleet';

function initApiExplorer() {
  const items = document.querySelectorAll('.api-item');
  const runBtn = document.getElementById('btnRunApi');

  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      currentEndpointKey = item.getAttribute('data-endpoint');
      renderApiDetails();
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', executeActiveApi);
  }

  renderApiDetails();
}

function renderApiDetails() {
  const spec = API_SPECS[currentEndpointKey];
  if (!spec) return;

  const methodEl = document.getElementById('activeApiMethod');
  const urlEl = document.getElementById('activeApiUrl');
  const descEl = document.getElementById('activeApiDesc');
  const reqBox = document.getElementById('apiReqBox');
  const payloadEl = document.getElementById('apiReqPayload');

  methodEl.textContent = spec.method;
  methodEl.className = `http-badge ${spec.method.toLowerCase()}`;
  urlEl.textContent = spec.url;
  descEl.textContent = spec.desc;

  if (spec.hasBody) {
    reqBox.style.display = 'block';
    payloadEl.value = spec.defaultBody;
  } else {
    reqBox.style.display = 'none';
  }
}

async function executeActiveApi() {
  const spec = API_SPECS[currentEndpointKey];
  if (!spec) return;

  const outEl = document.getElementById('apiResponseOutput');
  const statusEl = document.getElementById('apiStatusBadge');
  outEl.textContent = '發送請求中 (Pending)...';

  const startTime = performance.now();
  try {
    const options = { method: spec.method, headers: {} };
    if (spec.hasBody) {
      options.headers['Content-Type'] = 'application/json';
      options.body = document.getElementById('apiReqPayload').value;
    }

    const res = await fetch(spec.url, options);
    const duration = Math.round(performance.now() - startTime);
    const json = await res.json();

    statusEl.textContent = `${res.status} ${res.statusText || 'OK'} • ${duration}ms`;
    statusEl.className = 'badge ' + (res.ok ? 'badge-emerald' : 'badge-danger');
    outEl.textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    statusEl.textContent = `Error • ${duration}ms`;
    statusEl.className = 'badge badge-danger';
    outEl.textContent = JSON.stringify({ error: err.message }, null, 2);
  }
}
