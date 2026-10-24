# Scootogether 2.0 (次世代機車即時媒合與智慧共乘系統)

> 🛵 **Next-Gen Urban Scooter Mobility, Smart Pooling & Dispatching Platform**  
> 基於 **Node.js 22 (ES Modules)**、**全雙工 WebSockets** 與 **高精度 Haversine 球面空間索引**，專為高密度城市打造的高併發機車即時媒合、同向動態共乘與全城調度中控系統。

---

## 🌟 核心特色與技術升級亮點

### 1. 🏙️ 全城動態調度中樞 (Real-time Fleet Command)
- **實時 GPS 車隊巡弋地圖**：前端基於 HTML5 Canvas 高效向量繪製，以 60 FPS 流暢渲染台北市大都會區路網與 12+ 台機車動態航向與粒子軌跡。
- **需求熱點圖 (Demand Heatmap)**：視覺化展示信義區、台北車站、公館台大、內湖科技園區等高峰出行需求。
- **毫秒級狀態廣播**：後端每 1.5 秒主動推播全城在線車輛座標，支援海量連線維持與低頻寬佔用。

### 2. 🌱 智慧動態共乘引擎 (Smart Ride-Pooling Engine)
- **廊道同向重疊匹配 (Corridor Overlap Algorithm)**：
  - 自動偵測行駛向量與路徑夾角重疊率 $\eta \ge 0.65$ 的乘客。
  - **乘客端**：享受 **35% 車資折扣**，直覺看到減碳克數（如每趟減少 420g $CO_2$）。
  - **司機端**：在順路路徑上賺取 **+18% 增額收益**，顯著降低空車巡弋率。
- **雙模式自由切換**：支援「疾速專車 (Solo Ride)」與「智慧共乘 (Smart Pooling)」。

### 3. 🛵 司機端接單 HUD 與行程狀態機 (Trip FSM)
- **15 秒秒級搶單雷達**：收到乘客叫車請求時，司機終端即刻彈出倒數雷達、路徑公里數、預估淨收入與一鍵接單。
- **行程生命週期狀態機**：
  $$\text{SEARCHING} \longrightarrow \text{MATCHED} \longrightarrow \text{ARRIVED} \longrightarrow \text{IN\_TRANSIT} \longrightarrow \text{COMPLETED}$$
  嚴格防範分散式並行衝突與無效跳轉。

### 4. ⚡ 內建 OpenAPI / RESTful 互動測試中台
- 開箱即可在瀏覽器內切換並實時測試 6 大核心 API（車隊狀態、空間半徑快搜、行程試算、派單、錢包、調度總覽），免安裝 Postman 即看 Request Payload 與即時 JSON 響應。

---

## 🚀 快速啟動

### 方法 A：雙擊 Windows 啟動腳本 (推薦)
雙擊目錄下的 `start.bat`，系統會自動啟動 Node.js 服務並優先調用 **Brave 瀏覽器** 開啟中控台：

```cmd
start.bat
```

### 方法 B：標準 npm 指令啟動
```bash
# 啟動即時伺服器 (Port 3000)
npm start

# 或熱重載開發模式
npm run dev
```
啟動後打開瀏覽器訪問：`http://localhost:3000`

---

## 🧮 核心演算法與數學原理

### 1. 大圓航線距離：Haversine 空間索引演算法
$$d = 2R \cdot \arcsin\left( \sqrt{ \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right) } \right)$$

- 其中 $R = 6,371.0088\text{ km}$ 為地球平均半徑，$\phi$ 為緯度，$\lambda$ 為經度。
- 系統以此公式在毫秒級時間內自空間幾何索引中篩選方圓 $3.5\text{ km}$ 內的可用機車。

### 2. 智慧共乘廊道匹配公式 (Corridor Overlap Ratio)
$$\eta = \frac{D_{\text{shared}}}{D_A + D_B} \cdot \cos(\theta_{\text{bearing\_diff}})$$

當重疊率 $\eta \ge 0.65$ 且總繞路時間 $\Delta t \le 4\text{ mins}$ 時，系統判定為最佳共乘組合，啟動動態折扣與雙向分攤。

---

## 📁 專案架構

```
Scootogether_app/
├── server.js              # Node.js 22 ESM 核心伺服器 (REST API + WebSocket 廣播)
├── services/
│   ├── geoEngine.js       # Haversine 球面距離、方向角與共乘試算演算法
│   ├── tripFsm.js         # 行程有限狀態機 (Trip State Machine)
│   └── fleetManager.js    # 台北指標地標、機車車隊即時遙測與錢包管理
├── public/
│   ├── index.html         # Cyber Mobility 調度中樞與多端模擬介面
│   ├── style.css          # 暗黑霓虹高質感視覺系統 (Glassmorphism & Neon HUD)
│   └── app.js             # 向量畫布渲染、WebSocket 通訊與雙端即時互動
├── package.json           # 現代 NPM 配置 (ES Modules, Express, ws, cors)
├── start.bat              # 一鍵秒開腳本 (優先支援 Brave 瀏覽器)
└── README.md              # 系統規格與演算法詳細說明
```

---

## 📡 RESTful API 規格一覽

| HTTP 方法 | 端點路徑 | 說明 |
| :--- | :--- | :--- |
| `GET` | `/api/health` | 伺服器健康狀態、Node.js 版本與即時 WebSocket 在線數 |
| `GET` | `/api/fleet` | 獲取全城在線機車座標、車型、車牌與司機狀態 |
| `GET` | `/api/drivers/nearby?lat=&lng=&radius=` | 空間半徑搜尋附近可用機車 |
| `POST` | `/api/rides/estimate` | 起訖點車資、公里數、時間與減碳克數試算 |
| `POST` | `/api/rides/request` | 發起叫車請求並向周遭司機終端推播派單雷達 |
| `POST` | `/api/rides/:id/accept` | 司機搶單接單 |
| `POST` | `/api/rides/:id/step` | 推進行程狀態機 (`ARRIVED` $\to$ `IN_TRANSIT` $\to$ `COMPLETED`) |
| `POST` | `/api/rides/:id/cancel` | 取消行程並釋放司機狀態 |
| `GET` | `/api/wallet/balance` | 查詢電子錢包餘額與累積節省車資 |
| `GET` | `/api/stats/overview` | 全城運力比、累計共乘次數與 ESG 等效減碳量 |

---

## 📄 License
MIT License © 2026 wytsai109
