# WindLens — UK Wind Generation Forecast & Purchasing Analytics

**WindLens** is an industrial-grade analytics application designed for UK energy utility trading desks, dispatch analysts, and energy buyers. It evaluates day-ahead wind power forecasts against actual outturn generation from the official **Elexon BMRS** data streams to support electricity purchasing, volume hedging, and imbalance risk mitigation.

---

## Table of Contents
1. [Core Purpose & Wholesale Market Context](#core-purpose--wholesale-market-context)
2. [Data Source Architecture & Validation Findings](#data-source-architecture--validation-findings)
3. [Anti-Lookahead Methodology & Decision Cutoffs](#anti-lookahead-methodology--decision-cutoffs)
4. [Cadence Alignment: Hourly vs Half-Hourly](#cadence-alignment-hourly-vs-half-hourly)
5. [Error Metrics & Mathematical Formulas](#error-metrics--mathematical-formulas)
6. [Application Architecture & Tech Stack](#application-architecture--tech-stack)
7. [Repository Folder Structure](#repository-folder-structure)
8. [Data Commitment Decision](#data-commitment-decision)
9. [Quick Start & Setup Instructions](#quick-start--setup-instructions)
   - [Method 1: Local Python + React (Development Mode)](#method-1-local-python--react-development-mode)
   - [Method 2: Standalone Production Mode (FastAPI serves React)](#method-2-standalone-production-mode-fastapi-serves-react)
   - [Method 3: Docker & Docker Compose](#method-3-docker--docker-compose)
10. [Automated Test Suite](#automated-test-suite)
11. [Deployment Guide (Vercel / Heroku)](#deployment-guide-vercel--heroku)
12. [Five-Minute Customer & Technical Walkthrough Scripts](#five-minute-customer--technical-walkthrough-scripts)
13. [Limitations & Future Roadmap](#limitations--future-roadmap)
14. [Disclosure of AI Tools](#disclosure-of-ai-tools)

---

## Core Purpose & Wholesale Market Context

In the UK wholesale electricity market (governed by the Balancing and Settlement Code / BSC):
- **Day-Ahead Electricity Purchasing**: Utilities and power suppliers submit bids and trade power on Day $D-1$ across the Day-Ahead daily auctions (e.g., EPEX SPOT and Nord Pool at 11:00 UTC) or bilateral contracts up to gate closure.
- **Imbalance Cashout Exposure**: Any deviation between contracted generation and physical outturn is settled through the Elexon System Buy Price (SBP) / System Sell Price (SSP) imbalance mechanism.
  - **Wind over-forecasting** ($F > A$) means less wind is available than expected. If procurement relies on the forecast unadjusted, the utility may be short of generation and need balancing or backup power.
  - **Wind under-forecasting** ($F < A$) means more wind is available than expected. If procurement relies on the forecast unadjusted, the utility may procure more conventional power than needed.

**WindLens** provides utility energy buyers with empirical accuracy metrics, error distributions, and historical backtests strictly aligned to simulated decision deadlines.

---

## Data Source Architecture & Validation Findings

The application consumes two official Elexon BMRS datasets for the evaluation period of **January 2026**:

1. **`WINDFOR` (Wind Generation Forecast Stream)**:
   - **Endpoint**: [Elexon BMRS WINDFOR Stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
   - **Total Records Loaded**: **18,104 rows** across **248 distinct publication vintages**.
   - **Delivery Cadence**: **Hourly** (`01:00:00` step, strictly starting at `:00:00Z`).
   - **Target Window**: Targets span from `2025-12-31 21:00 UTC` to `2026-02-02 21:00 UTC`.
   - **Republished / Rolling Horizons**: Each publication batch contains an approximately 73-hour rolling horizon (including ~24h of past hours and ~48h of future hours). 3,721 rows have `publishTime > startTime` (re-broadcasts/historical snapshots), necessitating strict filtering.
   - **Data Quality**: **0 nulls**, all generation values valid ($\ge 0$ MW).

2. **`FUELHH` (Actual Generation by Fuel Type)**:
   - **Endpoint**: [Elexon BMRS FUELHH Stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
   - **Total Records Loaded**: **1,536 rows** (all `fuelType: "WIND"`).
   - **Delivery Cadence**: **Half-Hourly** (48 Settlement Periods per day, `00:30:00` step).
   - **Boundary Isolation**: 
     - **January 2026**: Exactly **1,488 records** (31 days $\times$ 48 settlement periods).
     - **February 1, 2026**: Exactly **48 records** (Settlement Periods 1–48). 
     - *Validation Guarantee*: All 48 records from February 1st are strictly quarantined and excluded from January evaluations to prevent boundary contamination.
   - **Data Quality**: **0 nulls**, all generation values valid ($\ge 0$ MW).

---

## Anti-Lookahead Methodology & Decision Cutoffs

### The Look-Ahead Hazard
In historical backtesting, selecting the forecast published closest to the delivery hour (or after gate closure) introduces severe **look-ahead bias**, overstating forecast accuracy by utilizing meteorological observations not available to the energy trader at the moment of the purchasing decision.

### Anti-Lookahead Guarantees in WindLens
For any target delivery hour $h$ on Day $D$, WindLens enforces:
$$\text{Eligible Forecasts} = \{ f \in \text{WINDFOR} \mid \text{startTime}(f) = h \land \text{publishTime}(f) \le T_{\text{cutoff}}(D) \}$$
The selected forecast vintage is the most recent eligible submission:
$$f_{\text{selected}}(h) = \arg\max_{\text{publishTime}} (\text{Eligible Forecasts})$$

### Configurable Cutoff Strategies
1. **Day-Ahead D-1 12:00 UTC (Default Noon Benchmark)**: Classic UK day-ahead reference cutoff.
2. **Day-Ahead D-1 11:00 UTC (EPEX SPOT / Nord Pool GB Auction)**: Matches the official Day-Ahead auction clearing time.
3. **Day-Ahead D-1 17:00 UTC (Elexon Indicative Schedule)**: Elexon Day-Ahead operational planning cutoff.
4. **Rolling 24h / 12h / 4h Lead Time**: Requires forecasts to have been published at least $N$ hours prior to target delivery start.
5. **Latest Pre-Delivery (Lead Time $\ge 0$)**: Real-time dispatch baseline.

### Transparent Reporting of January 1st Data Limitation
The provided `windfor_jan_2026.json` dataset begins publications on **`2026-01-01 02:30:00 UTC`**.
- Under any Day-Ahead cutoff ($D-1$ 12:00 or 17:00), a forecast for January 1st would have had to be published on December 31st, 2025.
- Because no December 31st publications exist in the source file, WindLens **strictly excludes all 24 hours of January 1st** from Day-Ahead metrics rather than committing look-ahead bias by retroactively using post-cutoff vintages.
- Evaluated January coverage under Day-Ahead cutoffs is therefore **720 out of 744 hours (96.77%)**, which is honestly and explicitly documented throughout the application.

---

## Cadence Alignment: Hourly vs Half-Hourly

- **WINDFOR**: Hourly forecast intervals (e.g. `12:00:00Z`).
- **FUELHH**: Half-hourly settlement periods (e.g. `12:00:00Z` for SP 25, `12:30:00Z` for SP 26).

### WindLens Supports Two Explicit, Non-Fabricating Alignment Modes:
1. **Exact Match (`exact`) [Default]**:
   - Matches WINDFOR hourly timestamps directly to FUELHH `:00:00Z` records.
   - Evaluates 720/744 hours.
   - Transparently marks and reports the 744 half-hourly (`:30:00Z`) actuals as un-forecasted without interpolating or duplicating data.
2. **Hourly Mean (`hourly_mean`)**:
   - Averages the two half-hourly actual settlement periods for each clock hour:
     $$\text{Actual}_{\text{Hour } h} = \frac{\text{Actual}_{h:00} + \text{Actual}_{h:30}}{2}$$
   - Represents the true integrated hourly energy delivery (MWh) matching the 1-hour forecast window.

---

## Error Metrics & Mathematical Formulas

All metrics are computed strictly on valid, matched observation pairs ($N$):

| Metric | Formula | Practical Meaning for Energy Utility |
| :--- | :--- | :--- |
| **Error ($e_i$)** | $F_i - A_i$ (MW) | Positive = Over-forecast (Surplus); Negative = Under-forecast (Short) |
| **MAE** | $\frac{1}{N} \sum_{i=1}^N \|F_i - A_i\|$ | Average hourly purchasing imbalance volume |
| **RMSE** | $\sqrt{\frac{1}{N} \sum_{i=1}^N (F_i - A_i)^2}$ | Penalizes large forecasting shocks and extreme imbalances |
| **Bias (Mean Error)** | $\frac{1}{N} \sum_{i=1}^N (F_i - A_i)$ | Structural over- or under-hedging tendency |
| **WAPE** | $\frac{\sum \|F_i - A_i\|}{\sum A_i} \times 100\%$ | Normalized volume deviation relative to total system wind |
| **nRMSE** | $\frac{\text{RMSE}}{\bar{A}} \times 100\%$ | Normalized dispersion relative to mean generation |
| **Pearson Correlation ($r$)** | $\frac{\sum (A_i - \bar{A})(F_i - \bar{F})}{\sqrt{\sum (A_i - \bar{A})^2 \sum (F_i - \bar{F})^2}}$ | Linearity of wind trend capture |

### Summary Results (January 2026, Day-Ahead D-1 12:00 UTC Cutoff)
- **MAE**: `1,928.03 MW`
- **RMSE**: `2,384.91 MW`
- **Bias**: `+1,724.41 MW` (*Systematic over-forecasting observed*)
- **WAPE**: `16.83%`
- **nRMSE**: `20.82%`
- **Correlation ($r$)**: `0.9466`
- **Matched Observations**: `720 hours (96.77% of January)`

---

## Application Architecture & Tech Stack

- **Design Philosophy**: **"Editorial Energy Intelligence"** — a balance of premium climate-tech design, sophisticated data visualization, and institutional analytical credibility.
  - Palette: Warm chalk (`#F6F5EF`), deep forest green (`#18352D`), emerald actual series (`#14866D`), teal forecast series (`#247C8B`), restrained amber risk (`#C78336`), and muted sage surfaces (`#EFECE4`).
  - Typography: Editorial display serif (*Newsreader*) paired with clean sans (*Inter*) and tabular numerals (*JetBrains Mono*).
  - Wind-Inspired Motion: Lightweight HTML5 Canvas streamline simulation rendering aerodynamic atmospheric flow vectors with cursor deviation and `prefers-reduced-motion` compliance.
- **Client Routing**: Full multi-route architecture powered by `react-router-dom`:
  - **`/`**: Public product landing page with hero, live preview card, 3 value pillars, 3-step pipeline flow, trust contract, and institutional footer.
  - **`/app`**: Primary analytics workspace overview (Decision context bar, 4 primary KPIs, Chart.js time-series, diurnal profile, settlement delivery intervals table with CSV export).
  - **`/app/analysis`**: Forecast accuracy and cutoff vintage sensitivity dossier (D-1 12:00 vs D-1 17:00 vs rolling 4h gate closure).
  - **`/app/data-quality`**: 5-stage data lineage audit, record reconciliation, null checks, and boundary isolation.
  - **`/app/methodology`**: Formal BSC Section T mathematical formulas, look-ahead isolation guarantees, and known data constraints.
- **Backend**: Python 3.12+ / FastAPI / Pandas / NumPy / Pydantic / Uvicorn.
- **Frontend**: React 19 / Vite 8 / Vanilla CSS with design tokens / Chart.js + React-Chartjs-2 / Lucide-React / React Router 7.
- **Testing**: Pytest (13 unit and integration tests covering loader, validation, anti-lookahead, metrics, and API endpoints).
- **Containerization**: Multi-stage production `Dockerfile` and `docker-compose.yml`.

---

## Repository Folder Structure

```
windlens/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI endpoints, CORS, static frontend mount & SPA fallback
│   │   ├── data_loader.py     # Resilient JSON loading, schema & count checks
│   │   ├── validation.py      # Diagnostic checks, Feb 1 isolation, cadence reports
│   │   ├── forecasting.py     # Anti-lookahead vintage selection & alignment
│   │   ├── metrics.py         # Statistical formulas (MAE, RMSE, Bias, WAPE, nRMSE)
│   │   └── schemas.py         # Pydantic response models
│   ├── data/
│   │   └── raw/
│   │       ├── fuelhh_wind_jan_2026.json      # 1,536 records (preserved)
│   │       ├── fuelhh_wind_jan_2026.json.json # Original raw file
│   │       ├── windfor_jan_2026.json          # 18,104 records (preserved)
│   │       └── windfor_jan_2026.json.json     # Original raw file
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_api.py        # TestClient endpoint validation
│   │   ├── test_forecasting.py# Anti-lookahead & cutoff proof tests
│   │   ├── test_loader.py     # Loader & incomplete file rejection
│   │   ├── test_metrics.py    # Hand-checked formula verification
│   │   └── test_validation.py # Cadence & boundary isolation tests
│   ├── requirements.txt
│   └── Dockerfile             # Standalone backend container
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx           # Public product landing page (/)
│   │   │   ├── WindFlowStreamlines.jsx   # Canvas streamline flow motion graphic
│   │   │   ├── Header.jsx                # Institutional header with route navigation & status
│   │   │   ├── ControlBar.jsx            # Cutoff, alignment, & date filters
│   │   │   ├── KpiGrid.jsx               # Editorial 4-primary KPI cards with tabular numerals
│   │   │   ├── TimeSeriesChart.jsx       # Chart.js Actual (emerald) vs Forecast (teal) line chart
│   │   │   ├── ErrorDistributionChart.jsx# Error deviation & diurnal bias charts
│   │   │   ├── DeliveryIntervalsTable.jsx# Settlement delivery intervals audit log with CSV export
│   │   │   ├── DailyPerformanceTable.jsx # 31-day daily accuracy breakdown table
│   │   │   └── DataQualityAudit.jsx      # 5-stage ingestion lineage & governance audit
│   │   ├── App.jsx                       # Multi-route controller and workspace manager
│   │   ├── main.jsx                      # React 19 entry with BrowserRouter
│   │   └── index.css                     # Editorial Energy Intelligence design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js                    # Vite configuration with /api dev proxy
├── Dockerfile                 # Multi-stage full application container
├── docker-compose.yml         # Local container orchestration
├── .env.example               # Environment variable reference
├── .gitignore
└── README.md                  # Comprehensive documentation
```

---

## Data Commitment Decision

The two source JSON files have a combined size of **~2.9 MB** (`fuelhh`: 352 KB, `windfor`: 2.58 MB). 
- **Decision**: The raw JSON datasets **are committed directly into Git under `backend/data/raw/`**.
- **Rationale**: 2.9 MB is far below Git/GitHub repository thresholds (< 50 MB recommendation, < 100 MB hard limit). Committing the files ensures zero friction for hiring reviewers—anyone cloning the repo can immediately run `docker compose up` or `python -m pytest` with zero manual download steps.
- **Integrity**: Original source files (`.json.json`) are preserved in their exact raw state without mutation.

---

## Quick Start & Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

---

### Method 1: Local Python + React (Development Mode)

#### 1. Backend Setup
```bash
# From workspace root
cd backend
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
# In a new terminal from workspace root
cd frontend
npm install

# Start Vite dev server on port 5173 (automatically proxies /api to port 8000)
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Method 2: Standalone Production Mode (FastAPI serves React)

FastAPI is configured to automatically serve the built React static bundle from `frontend/dist`. You can run the entire application on a single port:

```bash
# 1. Build the React frontend
cd frontend
npm install
npm run build
cd ..

# 2. Launch FastAPI
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open **`http://127.0.0.1:8000`** in your browser. Both the React SPA and REST API are served together.

---

### Method 3: Docker & Docker Compose

Run the entire application in a standardized container with one command:

```bash
# Build and run with Docker Compose
docker compose up --build
```
Open **`http://localhost:8000`**.

Or with direct Docker commands:
```bash
docker build -t windlens .
docker run -p 8000:8000 windlens
```

---

## Automated Test Suite

WindLens includes 13 automated tests covering:
- Incomplete dataset rejection (< 100 records guard)
- Schema and column validation
- February 1st boundary record detection and exclusion
- **Proof of Anti-Lookahead Isolation**: Synthetic tests proving that a forecast published after cutoff is never selected
- Unforecasted January 1st handling under D-1 cutoff
- Hourly mean vs exact match aggregation
- Hand-verified metric calculations (MAE, RMSE, Bias sign convention)
- Empty dataframe handling
- FastAPI TestClient endpoint integration (`/api/health`, `/api/quality`, `/api/summary`, `/api/timeseries`)

### Running the Tests
```bash
# From workspace root
python -m pytest backend/tests -v
```

Expected output:
```
backend/tests/test_api.py::test_api_health_endpoint PASSED
backend/tests/test_api.py::test_api_quality_endpoint PASSED
backend/tests/test_api.py::test_api_summary_endpoint PASSED
backend/tests/test_api.py::test_api_timeseries_endpoint PASSED
backend/tests/test_forecasting.py::test_anti_lookahead_synthetic_proof PASSED
backend/tests/test_forecasting.py::test_day_ahead_dminus1_excludes_unforecasted_jan1 PASSED
backend/tests/test_forecasting.py::test_hourly_mean_alignment_averages_half_hours PASSED
backend/tests/test_loader.py::test_loader_finds_and_loads_fuelhh PASSED
backend/tests/test_loader.py::test_loader_finds_and_loads_windfor PASSED
backend/tests/test_loader.py::test_loader_rejects_incomplete_dataset PASSED
backend/tests/test_metrics.py::test_metrics_calculation_hand_checked PASSED
backend/tests/test_metrics.py::test_metrics_empty_dataframe PASSED
backend/tests/test_validation.py::test_validation_detects_february_records_and_january_subset PASSED
============================== 13 passed in 2.85s ==============================
```

---

## Deployment Guide (Vercel / Heroku)

The challenge asks for a Vercel or Heroku deployment. The root multi-stage `Dockerfile` packages the React build and FastAPI service together, so Heroku Container Registry is the direct option when deploying this image. It requires the Docker CLI and Heroku CLI. Vercel supports React and Python/FastAPI deployments through its runtimes, but that path does not run this Dockerfile.

1. Push the public GitHub repository.
2. For Heroku, create an app, select the `container` stack, then build and release the `web` image with the Heroku CLI (`heroku container:push web` and `heroku container:release web`).
3. Verify the app UI and `/api/health` endpoint from an incognito window.

The two-part demo outline is in [`docs/demo-script.md`](docs/demo-script.md). The final YouTube video must be unlisted and no longer than 10 minutes; add its URL to the submission form.

---

## Five-Minute Customer & Technical Walkthrough Scripts

### Customer Demo (5 Minutes: For Energy Utility Commercial Lead)
1. **0:00 – 1:00 | The Business Problem**:
   - *"Welcome to WindLens. We compare day-ahead wind forecasts with actual generation so a purchasing team can see forecast error and the risk of relying on a forecast that overstates or understates available wind. This pilot measures volume error; it does not calculate imbalance cash costs."*
2. **1:00 – 2:30 | The Operational Dashboard**:
   - *"Here the KPI cards summarize the selected delivery window and cutoff. The MAE shows typical absolute error, while signed bias shows whether forecast wind was above or below outturn on average. The chart and interval table let us inspect individual delivery hours and their selected forecast publication times."*
3. **2:30 – 3:45 | Interactive Decision Cutoffs**:
   - *"Changing the cutoff reruns the historical selection using only vintages available by that decision time. On the analysis page, the D-1 noon and 17:00 MAE values are computed from the selected window. A later cutoff comparison is evidence about forecast accuracy only; it is not a cash-savings estimate."*
4. **3:45 – 5:00 | Risk Management & Transparency**:
   - *"Finally, the daily breakdown and data-quality views show evaluated hours, error, and missing coverage. They support further review of volatile days without claiming a causal weather explanation or a trading outcome."*

---

### Technical Architecture Walkthrough (5 Minutes: For Technical Lead)
1. **0:00 – 1:15 | Architecture & Design**:
   - *"WindLens is built with Python and FastAPI for data loading and metric calculation, and React 19 for the web interface. The analysis uses saved January BMRS records and reports its alignment and coverage assumptions."*
2. **1:15 – 2:30 | Data Engineering & Look-Ahead Protection**:
   - *"During data ingestion of the 18,104 WINDFOR records, we discovered 3,721 rows with publish timestamps after the target start time. In `backend/app/forecasting.py`, we implemented strict anti-lookahead filtering. For any target delivery hour $h$ on day $D$, only forecasts published on or before the simulated cutoff (e.g. D-1 12:00) are considered. We wrote automated unit tests proving that a forecast published after cutoff is never selected."*
3. **2:30 – 3:45 | Cadence Resolution & Boundary Exclusions**:
   - *"The FUELHH actuals stream arrived at 30-minute intervals (1,536 rows), while WINDFOR was hourly (744 January intervals). Rather than duplicating forecasts into half-hours, WindLens provides two honest modes: Exact Match (:00 only) and Hourly Mean. Furthermore, our validation engine detected 48 records from February 1st in FUELHH and cleanly quarantined them from January metrics."*
4. **3:45 – 5:00 | Testing, Docker & Deployment**:
   - *"The repository includes tests for the loader, metric calculations, cutoff selection, and API responses. The root multi-stage Dockerfile builds the React app and packages it with FastAPI. A deployment URL should be included here once a public deployment is available."*

---

## Limitations & Future Roadmap

1. **Intra-Day Balancing Mechanism (BM) Price Integration**:
   - *Current*: Evaluates volumetric deviations (MW and MWh).
   - *Roadmap*: Join with Elexon System Buy Price (SBP) and System Sell Price (SSP) data streams to compute actual cashout financial P&L in GBP (£).
2. **Geographic DNO / Grid Supply Point (GSP) Disaggregation**:
   - *Current*: National aggregate wind generation.
   - *Roadmap*: Incorporate transmission constraint zone forecasts (e.g., Scotland export boundaries) to identify localized curtailment.
3. **Automated Elexon API Ingestion Pipeline**:
   - *Current*: Offline file ingestion from supplied verified historical files.
   - *Roadmap*: Live streaming WebSocket/HTTP worker pulling current month Elexon BMRS streams into PostgreSQL/DuckDB.

---

## Disclosure of AI Tools

In accordance with challenge requirements, the following AI development tools were utilized during the design and development of WindLens:
- **Agentic Coding Environment**: Antigravity IDE (Google DeepMind) powered by **Gemini 3.8 Flash**.
- **Role & Scope of AI Assistance**:
  - Accelerated initial exploratory data analysis scripts for schema inspection and duplicate detection.
  - Assisted in scaffolding boilerplate Pydantic schemas, FastAPI router templates, and Vite configuration.
  - Generated unit test assertions for mathematical metric sanity checks.
- **Human Technical Oversight**:
  - All domain logic, market cutoff definitions (Elexon BSC D-1 auction timings), sign conventions (Forecast − Actual), look-ahead bias proofs, boundary isolation of February 1st records, and architectural decisions were explicitly verified, reviewed, and tested against live data files.
