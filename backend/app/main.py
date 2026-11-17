import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

try:
    from supabase import create_client
except ImportError:
    create_client = None

from .local_store import LocalStore

load_dotenv()

API_KEY = os.getenv("INDUNEX_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
_supabase: Any = None
_local_store: LocalStore | None = None


def get_client() -> Any:
    global _supabase, _local_store
    if bool(SUPABASE_URL) != bool(SUPABASE_SERVICE_ROLE_KEY):
        raise HTTPException(
            status_code=503,
            detail="Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both unset for local demo mode.",
        )
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        if not create_client:
            raise HTTPException(status_code=503, detail="Supabase client package is unavailable")
        if _supabase is None:
            _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        return _supabase
    if _local_store is None:
        _local_store = LocalStore()
    return _local_store


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail="API access is not configured. Set INDUNEX_API_KEY on the backend.",
        )
    if x_api_key is None or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


app = FastAPI(title="INDUNEX Operations API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "INDUNEX_CORS_ORIGINS", "http://localhost:5173"
    ).split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "X-API-Key"],
)


def envelope(data: Any, **meta: Any) -> dict[str, Any]:
    result: dict[str, Any] = {"data": data}
    if isinstance(data, list):
        result["meta"] = {"count": len(data), **meta}
    return result


def rows(client: Any, table: str, factory_id: UUID, limit: int | None = None) -> list[dict]:
    query = client.table(table).select("*").eq("factory_id", str(factory_id))
    if limit is not None:
        query = query.order("recorded_at", desc=True).limit(limit)
    response = query.execute()
    return response.data or []


def require_factory(client: Any, factory_id: UUID) -> dict:
    result = client.table("factories").select("*").eq("id", str(factory_id)).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Factory not found")
    return result.data


def related_ids(client: Any, table: str, factory_id: UUID) -> list[str]:
    result = client.table(table).select("id").eq("factory_id", str(factory_id)).execute()
    return [item["id"] for item in (result.data or [])]


def save_row(client: Any, table: str, values: dict) -> dict:
    result = client.table(table).insert(values).execute()
    if not result.data:
        raise HTTPException(status_code=502, detail=f"Could not save {table} record")
    return result.data[0]


class SimulationRequest(BaseModel):
    factory_id: UUID
    scenario_name: str = Field(min_length=1, max_length=120)
    input_parameters: dict[str, Any] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    factory_id: UUID
    process_id: UUID | None = None
    machine_id: UUID | None = None
    required_capacity_per_hour: float | None = Field(default=None, gt=0)


class PredictionEvaluateRequest(BaseModel):
    factory_id: UUID


class InterventionPreviewRequest(BaseModel):
    factory_id: UUID
    machine_id: UUID | None = None
    process_id: UUID | None = None
    prediction_id: UUID | None = None
    intervention_type: str = Field(pattern="^(workload_shift|machine_adjustment|maintenance)$")
    description: str = Field(min_length=1, max_length=2000)
    expected_impact: str = Field(min_length=1, max_length=1000)


class SettingsPatch(BaseModel):
    configuration: dict[str, Any] | None = None
    alert_thresholds: dict[str, Any] | None = None
    automation_enabled: bool | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api = FastAPI(dependencies=[Depends(require_api_key)])
app.mount("/api/v1", api)


@api.get("/factories")
def list_factories(client: Any = Depends(get_client)) -> dict:
    result = client.table("factories").select("*").order("name").execute()
    return envelope(result.data or [])


@api.get("/factories/{factory_id}")
def get_factory(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    return envelope(require_factory(client, factory_id))


@api.get("/dashboard/overview")
def dashboard_overview(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    factory = require_factory(client, factory_id)
    machines = rows(client, "machines", factory_id)
    processes = rows(client, "processes", factory_id)
    active_alerts_response = (
        client.table("alerts").select("*", count="exact")
        .eq("factory_id", str(factory_id)).eq("status", "active")
        .order("created_at", desc=True).limit(200).execute()
    )
    active_alerts = active_alerts_response.count or 0
    active_alert_rows = active_alerts_response.data or []
    process_ids = [item["id"] for item in processes]
    production: list[dict] = []
    if process_ids:
        result = (
            client.table("production_records")
            .select("*")
            .in_("process_id", process_ids)
            .order("recorded_at", desc=True)
            .limit(200)
            .execute()
        )
        production = result.data or []
    units = sum(item.get("units_produced", 0) for item in production)
    running = sum(item.get("status") == "running" for item in machines)
    high_risk_predictions = (
        client.table("predictions")
        .select("id", count="exact")
        .eq("factory_id", str(factory_id))
        .in_("risk_level", ["high", "critical"])
        .gte("created_at", (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat())
        .execute()
    ).count or 0
    avg_util = round(
        sum(float(m.get("current_utilization", 0)) for m in machines) / len(machines), 1
    ) if machines else 0
    machine_ids = [item["id"] for item in machines]
    telemetry_sources: set[str] = set()
    if machine_ids:
        telemetry = (
            client.table("machine_telemetry").select("data_source")
            .in_("machine_id", machine_ids)
            .order("recorded_at", desc=True).limit(500).execute()
        ).data or []
        telemetry_sources = {item["data_source"] for item in telemetry}
    return envelope(
        {
            "factory": factory,
            "metrics": {
                "units_produced": units,
                "machines_running": running,
                "machines_total": len(machines),
                "active_alerts": active_alerts,
                "high_risk_predictions": high_risk_predictions,
                "average_utilization_percent": avg_util,
            },
            "production": production[:24],
            "machines": machines,
            "processes": processes,
            "alerts": active_alert_rows[:8],
            "telemetry_source": (
                "mixed" if len(telemetry_sources) > 1
                else next(iter(telemetry_sources), "unknown")
            ),
        }
    )


@api.get("/processes")
def list_processes(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("processes")
        .select("*")
        .eq("factory_id", str(factory_id))
        .order("sequence_order")
        .execute()
    )
    return envelope(result.data or [])


@api.get("/machines")
def list_machines(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("machines")
        .select("*")
        .eq("factory_id", str(factory_id))
        .order("name")
        .execute()
    )
    return envelope(result.data or [])


@api.get("/telemetry")
def list_telemetry(
    factory_id: UUID,
    machine_id: UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    client: Any = Depends(get_client),
) -> dict:
    machine_ids = related_ids(client, "machines", factory_id)
    if machine_id is not None:
        if str(machine_id) not in machine_ids:
            raise HTTPException(status_code=404, detail="Machine not found")
        machine_ids = [str(machine_id)]
    if not machine_ids:
        return envelope([])
    result = (
        client.table("machine_telemetry")
        .select("*")
        .in_("machine_id", machine_ids)
        .order("recorded_at", desc=True)
        .limit(limit)
        .execute()
    )
    return envelope(result.data or [])


@api.get("/production")
def list_production(
    factory_id: UUID,
    process_id: UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    client: Any = Depends(get_client),
) -> dict:
    process_ids = related_ids(client, "processes", factory_id)
    if process_id is not None:
        if str(process_id) not in process_ids:
            raise HTTPException(status_code=404, detail="Process not found")
        process_ids = [str(process_id)]
    if not process_ids:
        return envelope([])
    result = (
        client.table("production_records")
        .select("*")
        .in_("process_id", process_ids)
        .order("recorded_at", desc=True)
        .limit(limit)
        .execute()
    )
    return envelope(result.data or [])


@api.get("/dependencies")
def list_dependencies(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("process_dependencies")
        .select("*")
        .eq("factory_id", str(factory_id))
        .execute()
    )
    return envelope(result.data or [])


@api.get("/inventory")
def list_inventory(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("inventory")
        .select("*")
        .eq("factory_id", str(factory_id))
        .order("item_name")
        .execute()
    )
    return envelope(result.data or [])


@api.get("/predictions")
def list_predictions(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("predictions")
        .select("*")
        .eq("factory_id", str(factory_id))
        .order("created_at", desc=True)
        .execute()
    )
    return envelope(result.data or [])


@api.post("/predictions/evaluate")
def evaluate_predictions(body: PredictionEvaluateRequest, client: Any = Depends(get_client)) -> dict:
    require_factory(client, body.factory_id)
    machine_ids = related_ids(client, "machines", body.factory_id)
    if not machine_ids:
        return envelope({
            "evaluated_machines": 0,
            "predictions": [],
            "model_version": "rules-anomaly-1.0",
            "data_source": "threshold_rules",
        })
    settings = (
        client.table("factory_settings").select("alert_thresholds")
        .eq("factory_id", str(body.factory_id)).maybe_single().execute()
    ).data or {}
    thresholds = settings.get("alert_thresholds") or {}
    try:
        temperature_limit = float(thresholds.get("temperature_celsius", 82))
        vibration_limit = float(thresholds.get("vibration_mm_s", 0.7))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Temperature and vibration thresholds must be numeric") from exc
    if temperature_limit <= 0 or vibration_limit <= 0:
        raise HTTPException(status_code=422, detail="Temperature and vibration thresholds must be positive")
    readings = (
        client.table("machine_telemetry").select("*")
        .in_("machine_id", machine_ids)
        .order("recorded_at", desc=True).limit(500).execute()
    ).data or []
    latest = {}
    for reading in readings:
        latest.setdefault(reading["machine_id"], reading)
    found = []
    for machine_id, reading in latest.items():
        temperature = float(reading["temperature"])
        vibration = float(reading["vibration"])
        temperature_ratio = temperature / temperature_limit
        vibration_ratio = vibration / vibration_limit
        excess = max(temperature_ratio, vibration_ratio)
        if excess <= 1:
            continue
        existing = (
            client.table("predictions").select("*")
            .eq("factory_id", str(body.factory_id))
            .eq("machine_id", machine_id)
            .eq("prediction_type", "anomaly")
            .eq("model_version", "rules-anomaly-1.0")
            .gte("created_at", reading["recorded_at"])
            .order("created_at", desc=True).limit(1).execute()
        ).data or []
        if existing:
            found.append(existing[0])
            continue
        probability = round(min(0.99, max(0.51, 0.6 + (excess - 1) * 0.25)), 2)
        risk = "critical" if probability >= 0.9 else "high" if probability >= 0.8 else "medium"
        machine = (
            client.table("machines").select("name,process_id")
            .eq("id", machine_id).maybe_single().execute()
        ).data
        reasons = []
        if temperature_ratio > 1:
            reasons.append(f"temperature {temperature:g} exceeds {temperature_limit:g} C")
        if vibration_ratio > 1:
            reasons.append(f"vibration {vibration:g} exceeds {vibration_limit:g} mm/s")
        source_note = " This reading is simulated." if reading.get("data_source") == "simulated" else ""
        prediction = save_row(client, "predictions", {
            "factory_id": str(body.factory_id),
            "process_id": machine["process_id"] if machine else None,
            "machine_id": machine_id,
            "prediction_type": "anomaly",
            "risk_level": risk,
            "probability": probability,
            "predicted_impact": "Threshold exceeded: " + "; ".join(reasons) + ".",
            "estimated_time_to_event": None,
            "recommendation": "Review the reading with the equipment operator before scheduling an inspection." + source_note,
            "model_version": "rules-anomaly-1.0",
        })
        save_row(client, "alerts", {
            "factory_id": str(body.factory_id),
            "machine_id": machine_id,
            "process_id": machine["process_id"] if machine else None,
            "prediction_id": prediction["id"],
            "title": f"Telemetry threshold exceeded: {machine['name'] if machine else 'Machine'}",
            "description": prediction["predicted_impact"] + source_note,
            "severity": "critical" if risk == "critical" else "warning",
            "status": "active",
        })
        found.append(prediction)
    return envelope({
        "evaluated_machines": len(latest),
        "predictions": found,
        "model_version": "rules-anomaly-1.0",
        "data_source": "threshold_rules",
    })


@api.get("/alerts")
def list_alerts(
    factory_id: UUID,
    status: str | None = None,
    client: Any = Depends(get_client),
) -> dict:
    query = client.table("alerts").select("*").eq("factory_id", str(factory_id))
    if status:
        query = query.eq("status", status)
    return envelope(query.order("created_at", desc=True).execute().data or [])


@api.get("/interventions")
def list_interventions(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("interventions")
        .select("*")
        .eq("factory_id", str(factory_id))
        .order("created_at", desc=True)
        .execute()
    )
    return envelope(result.data or [])


@api.post("/simulations/run")
def run_simulation(body: SimulationRequest, client: Any = Depends(get_client)) -> dict:
    require_factory(client, body.factory_id)
    machines = rows(client, "machines", body.factory_id)
    if not machines:
        raise HTTPException(status_code=422, detail="Factory has no machines to simulate")
    baseline = {
        "machines_total": len(machines),
        "average_utilization": round(
            sum(float(item.get("current_utilization") or 0) for item in machines) / len(machines), 2
        ),
        "capacity_per_hour": round(
            sum(float(item.get("capacity_per_hour") or 0) for item in machines), 2
        ),
    }
    try:
        utilization_delta = float(body.input_parameters.get("utilization_delta", 0))
        capacity_multiplier = float(body.input_parameters.get("capacity_multiplier", 1))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Simulation parameters must be numeric") from exc
    if not -100 <= utilization_delta <= 100 or not 0 <= capacity_multiplier <= 3:
        raise HTTPException(status_code=422, detail="Simulation parameters are outside supported limits")
    simulated = {
        **baseline,
        "average_utilization": round(max(0, min(100, baseline["average_utilization"] + utilization_delta)), 2),
        "capacity_per_hour": round(baseline["capacity_per_hour"] * capacity_multiplier, 2),
    }
    output = save_row(client, "simulation_runs", {
        "factory_id": str(body.factory_id),
        "scenario_name": body.scenario_name,
        "input_parameters": body.input_parameters,
        "baseline_metrics": baseline,
        "simulated_metrics": simulated,
        "recommendations": [
            "Review the affected process capacity with the shift lead before applying any change."
        ],
        "status": "completed",
    })
    return envelope(output)


@api.get("/simulations/{simulation_id}")
def get_simulation(
    simulation_id: UUID,
    factory_id: UUID,
    client: Any = Depends(get_client),
) -> dict:
    result = (
        client.table("simulation_runs")
        .select("*")
        .eq("id", str(simulation_id))
        .eq("factory_id", str(factory_id))
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return envelope(result.data)


@api.post("/recommendations/evaluate")
def evaluate_recommendations(body: RecommendationRequest, client: Any = Depends(get_client)) -> dict:
    require_factory(client, body.factory_id)
    candidates = rows(client, "machines", body.factory_id)
    if body.process_id is not None:
        process = (
            client.table("processes").select("id")
            .eq("id", str(body.process_id))
            .eq("factory_id", str(body.factory_id)).maybe_single().execute()
        )
        if not process.data:
            raise HTTPException(status_code=404, detail="Process not found")
        candidates = [m for m in candidates if m.get("process_id") == str(body.process_id)]
    if body.machine_id is not None:
        if str(body.machine_id) not in related_ids(client, "machines", body.factory_id):
            raise HTTPException(status_code=404, detail="Machine not found")
        candidates = [m for m in candidates if m.get("id") != str(body.machine_id)]
    if body.required_capacity_per_hour is not None:
        candidates = [
            m for m in candidates
            if float(m.get("capacity_per_hour") or 0) >= body.required_capacity_per_hour
            and m.get("status") in ("running", "idle")
        ]
    recommendations = [
        {
            "machine_id": machine["id"],
            "machine_name": machine["name"],
            "capacity_per_hour": machine.get("capacity_per_hour"),
            "current_utilization": machine.get("current_utilization"),
            "probability": round(max(0, min(1, 1 - float(machine.get("current_utilization") or 0) / 125)), 2),
            "reason": "Available machine capacity can support a workload review.",
        }
        for machine in sorted(candidates, key=lambda item: float(item.get("current_utilization") or 0))[:5]
    ]
    return envelope({"recommendations": recommendations, "data_source": "rule_based"})


@api.post("/interventions/preview")
def preview_intervention(body: InterventionPreviewRequest, client: Any = Depends(get_client)) -> dict:
    require_factory(client, body.factory_id)
    machine_record = None
    for table, related_id, message in (
        ("machines", body.machine_id, "Machine not found"),
        ("processes", body.process_id, "Process not found"),
        ("predictions", body.prediction_id, "Prediction not found"),
    ):
        if related_id is None:
            continue
        related = (
            client.table(table).select("id")
            .eq("id", str(related_id))
            .eq("factory_id", str(body.factory_id)).maybe_single().execute()
        )
        if not related.data:
            raise HTTPException(status_code=404, detail=message)
        if table == "machines":
            machine_record = (
                client.table("machines").select("process_id")
                .eq("id", str(related_id)).maybe_single().execute()
            ).data
    if (
        machine_record
        and body.process_id is not None
        and machine_record.get("process_id") != str(body.process_id)
    ):
        raise HTTPException(status_code=422, detail="Machine is not assigned to the specified process")
    saved = save_row(client, "interventions", {
        **body.model_dump(mode="json"),
        "status": "proposed",
    })
    return envelope(saved)


@api.post("/interventions/{intervention_id}/approve")
def approve_intervention(
    intervention_id: UUID,
    factory_id: UUID,
    client: Any = Depends(get_client),
) -> dict:
    result = (
        client.table("interventions").update({"status": "approved"})
        .eq("id", str(intervention_id)).eq("factory_id", str(factory_id))
        .eq("status", "proposed").execute()
    )
    if result.data:
        return envelope(result.data[0])
    existing = (
        client.table("interventions").select("id")
        .eq("id", str(intervention_id)).eq("factory_id", str(factory_id))
        .maybe_single().execute()
    ).data
    if not existing:
        raise HTTPException(status_code=404, detail="Intervention not found")
    raise HTTPException(status_code=409, detail="Only proposed interventions can be approved")


@api.post("/interventions/{intervention_id}/execute")
def execute_intervention(
    intervention_id: UUID,
    factory_id: UUID,
    client: Any = Depends(get_client),
) -> dict:
    # Demo execution records the approved action; it never sends commands to machinery.
    result = client.table("interventions").update({
        "status": "executed",
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "actual_impact": "Recorded in demo mode; no machine-control command was sent.",
    }).eq("id", str(intervention_id)).eq("factory_id", str(factory_id)).eq("status", "approved").execute()
    if result.data:
        return envelope(result.data[0])
    existing = (
        client.table("interventions").select("id")
        .eq("id", str(intervention_id)).eq("factory_id", str(factory_id))
        .maybe_single().execute()
    ).data
    if not existing:
        raise HTTPException(status_code=404, detail="Intervention not found")
    raise HTTPException(status_code=409, detail="Intervention must be approved before execution")


@api.get("/settings")
def get_settings(factory_id: UUID, client: Any = Depends(get_client)) -> dict:
    result = (
        client.table("factory_settings").select("*")
        .eq("factory_id", str(factory_id)).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Factory settings not found")
    return envelope(result.data)


@api.patch("/settings/{settings_id}")
def patch_settings(
    settings_id: UUID,
    factory_id: UUID,
    body: SettingsPatch,
    client: Any = Depends(get_client),
) -> dict:
    values = body.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(status_code=422, detail="At least one settings field is required")
    if any(value is None for value in values.values()):
        raise HTTPException(status_code=422, detail="Settings fields cannot be null")
    values["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        client.table("factory_settings").update(values)
        .eq("id", str(settings_id)).eq("factory_id", str(factory_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Factory settings not found")
    return envelope(result.data[0])
