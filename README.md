# INDUNEX

INDUNEX pairs a React operations dashboard with a FastAPI service and a Supabase/Postgres data store.

## API contract

Base path: `/api/v1`. Requests require `X-API-Key` in the local demo. Collection responses use `{ "data": [...], "meta": { "count": n } }`; object/action responses use `{ "data": { ... } }`. Errors use FastAPI's `{ "detail": "..." }`. IDs are UUIDs, timestamps are ISO 8601, and prediction probabilities are in `[0, 1]`.

All collection endpoints that return factory-specific records require `factory_id`. Telemetry also accepts `machine_id` and `limit`; production accepts `process_id` and `limit`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/overview?factory_id=<uuid>` | Facility metrics, recent output, machines, processes and active alerts |
| GET | `/factories` | List facilities |
| GET | `/factories/{factory_id}` | Facility details |
| GET | `/processes?factory_id=<uuid>` | Ordered production stages |
| GET | `/machines?factory_id=<uuid>` | Facility machines |
| GET | `/telemetry?factory_id=<uuid>&machine_id=<uuid>&limit=100` | Readings with per-row `data_source` (`sensor` or `simulated`) |
| GET | `/production?factory_id=<uuid>&process_id=<uuid>&limit=100` | Production history |
| GET | `/dependencies?factory_id=<uuid>` | Process dependency edges |
| GET | `/inventory?factory_id=<uuid>` | Materials and spares |
| GET | `/predictions?factory_id=<uuid>` | Stored risk assessments |
| POST | `/predictions/evaluate` | Evaluate latest telemetry against configured thresholds and store anomalies |
| GET | `/alerts?factory_id=<uuid>&status=active` | Facility alerts |
| GET | `/interventions?factory_id=<uuid>` | Intervention history |
| POST | `/simulations/run` | Save a what-if simulation |
| GET | `/simulations/{simulation_id}?factory_id=<uuid>` | Retrieve a simulation |
| POST | `/recommendations/evaluate` | Return rule-based alternative-machine recommendations |
| POST | `/interventions/preview` | Save a proposal in `proposed` state |
| POST | `/interventions/{intervention_id}/approve?factory_id=<uuid>` | Approve a proposed intervention |
| POST | `/interventions/{intervention_id}/execute?factory_id=<uuid>` | Record execution of an approved demo intervention |
| GET | `/settings?factory_id=<uuid>` | Read factory configuration |
| PATCH | `/settings/{settings_id}?factory_id=<uuid>` | Update configuration and thresholds |

Example list response:

```json
{
  "data": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "machine_id": "30000000-0000-4000-8000-000000000001",
      "temperature": 61.2,
      "vibration": 0.18,
      "power_consumption": 12.4,
      "rotational_speed": 1480,
      "processing_time": 7.8,
      "recorded_at": "2026-11-17T06:24:00+00:00",
      "data_source": "simulated"
    }
  ],
  "meta": { "count": 1 }
}
```

`data_source` is an explicit addition to `machine_telemetry`; it is not inferred from the readings. The SQL demo seed labels every generated reading `simulated`. The anomaly evaluator and recommendation evaluator are transparent threshold/rule-based demo logic, not a trained industrial ML model.

## Supabase setup

1. Apply `supabase/migrations/202611170001_indunex_schema.sql` in the Supabase SQL editor.
2. Apply `supabase/seed.sql` for the illustrative aerospace facility and synthetic records.
3. RLS is enabled on all 12 tables. There are deliberately no anon/authenticated policies; browser clients cannot read or write tables directly. The backend uses the server-only service-role key.

For an offline demo, leave both Supabase variables unset. The backend starts an in-memory `LocalStore` with the same illustrative facility; edits reset when the backend restarts. Set both Supabase variables to use persisted Supabase data. Setting only one returns a configuration error instead of silently switching data sources.

## Local run

Copy `backend/.env.example` to `backend/.env` and set a long random `INDUNEX_API_KEY`. For Supabase persistence, also set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; otherwise leave both blank for the local in-memory demo. Copy `frontend/.env.example` to `frontend/.env` and set `INDUNEX_API_KEY` to the same local demo key. Vite's development proxy adds this key server-side; it is not bundled into browser JavaScript.

In separate terminals:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm install
npm run dev
```

The UI is at `http://localhost:5173`, the API at `http://localhost:8000/api/v1`, and API docs at `http://localhost:8000/api/v1/docs`. `/health` is an unauthenticated liveness check.

Run backend workflow tests from `backend/` with `python -m unittest discover -s tests`.

## Safety and deployment

The API key is a local-demo gate, not a production identity system. Do not expose the Supabase service-role key or use the shared demo API key in a public deployment. Production deployment needs authenticated users and factory-level authorization before exposing these routes. The execute endpoint only changes the intervention record from `approved` to `executed`; no machine-control integration is present or called. `automation_enabled` is stored configuration and does not authorize or trigger equipment control.
