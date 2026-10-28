# WindLens demo recording

The challenge requires one unlisted YouTube video with two parts and a total runtime under 10 minutes. Keep each part to five minutes or less. Target about four minutes per part.

## Part 1 — Customer presentation (about 4 minutes)

1. **Context (30 sec):** “WindLens helps a UK power buyer review the wind forecast available at a day-ahead decision point, then compare it with settled generation.”
2. **Decision overview (60 sec):** Show the date window, cutoff, actual alignment, KPI cards, and forecast-versus-outturn chart. Explain MAE, signed bias, and coverage in plain language.
3. **Forecast review (60 sec):** Change the cutoff and show the comparison. State that this measures volume accuracy; it does not estimate prices, cash savings, or trading P&L.
4. **Delivery intervals (45 sec):** Select Over-Forecast and Under-Forecast. Point out forecast, outturn, signed error, and forecast publication time for a delivery hour.
5. **Trust and close (45 sec):** Show matched-hour coverage, source record counts, cadence alignment, and boundary exclusions. Close by describing the January 2026 pilot scope and its limitations.

## Part 2 — Technical review and handover (about 4 minutes)

1. **Architecture (45 sec):** Show the repository structure. Describe React/Vite, FastAPI, the supplied BMRS files, and how Vercel routes the frontend and API services. Locally, Vite proxies API requests to FastAPI; the root Docker image can also serve the built UI from FastAPI.
2. **Forecast selection (60 sec):** Explain that each delivery hour uses only forecast publications available by the chosen decision cutoff, preventing look-ahead leakage.
3. **Alignment and metrics (60 sec):** Explain hourly WINDFOR forecasts versus half-hourly FUELHH actuals, exact-hour and hourly-mean modes, and how unmatched hours affect coverage.
4. **Data checks (45 sec):** Show the data integrity page, boundary exclusions, and where the methodology is implemented.
5. **Run and deploy (30 sec):** Show the README setup steps and Dockerfile. Only say Docker was built and run if you actually verify those steps. Show the deployed Vercel or Heroku URL and end with the key limitations.

Before recording, wait for the data-ready indicator, use a clean browser profile, and avoid personal tabs or account details. Upload the final video to YouTube with visibility set to **Unlisted**. Open the video, repository, and deployment URLs in an incognito window and verify access before submitting the form.
