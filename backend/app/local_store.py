import copy
import re
import uuid
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Dict, List, Optional


class QueryResult:
    def __init__(self, data: Any, count: Optional[int] = None):
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else (1 if data else 0))


class TableQuery:
    def __init__(self, store: "LocalStore", table_name: str):
        self.store = store
        self.table_name = table_name
        self._action = "select"
        self._select_cols = "*"
        self._count_mode: Optional[str] = None
        self._filters: List[Any] = []
        self._order_by: Optional[str] = None
        self._order_desc: bool = False
        self._limit_count: Optional[int] = None
        self._maybe_single: bool = False
        self._insert_data: Optional[Dict[str, Any]] = None
        self._update_data: Optional[Dict[str, Any]] = None

    def select(self, columns: str = "*", count: Optional[str] = None):
        self._action = "select"
        self._select_cols = columns
        self._count_mode = count
        return self

    def eq(self, column: str, value: Any):
        self._filters.append(lambda row: str(row.get(column)) == str(value))
        return self

    def gte(self, column: str, value: Any):
        self._filters.append(lambda row: str(row.get(column, "")) >= str(value))
        return self

    def in_(self, column: str, values: List[Any]):
        str_vals = {str(v) for v in values}
        self._filters.append(lambda row: str(row.get(column)) in str_vals)
        return self

    def order(self, column: str, desc: bool = False):
        self._order_by = column
        self._order_desc = desc
        return self

    def limit(self, count: int):
        self._limit_count = count
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def insert(self, values: Dict[str, Any]):
        self._action = "insert"
        self._insert_data = values
        return self

    def update(self, values: Dict[str, Any]):
        self._action = "update"
        self._update_data = values
        return self

    def execute(self) -> QueryResult:
        table = self.store.tables.setdefault(self.table_name, [])

        if self._action == "insert":
            row = copy.deepcopy(self._insert_data or {})
            if "id" not in row:
                row["id"] = str(uuid.uuid4())
            if "created_at" not in row:
                row["created_at"] = datetime.now(timezone.utc).isoformat()
            table.append(row)
            return QueryResult([row])

        if self._action == "update":
            with self.store.lock:
                updated_rows = []
                for row in table:
                    if all(f(row) for f in self._filters):
                        row.update(copy.deepcopy(self._update_data or {}))
                        updated_rows.append(row)
            return QueryResult(updated_rows)

        # Select action
        filtered = [row for row in table if all(f(row) for f in self._filters)]
        total_count = len(filtered)

        if self._order_by:
            filtered.sort(
                key=lambda r: (r.get(self._order_by) is not None, r.get(self._order_by)),
                reverse=self._order_desc,
            )

        if self._limit_count is not None:
            filtered = filtered[: self._limit_count]

        if self._maybe_single:
            result_data = filtered[0] if filtered else None
            return QueryResult(result_data, count=1 if result_data else 0)

        return QueryResult(filtered, count=total_count)


class LocalStore:
    def __init__(self):
        self.lock = RLock()
        self.tables: Dict[str, List[Dict[str, Any]]] = {}
        self._seed_default_data()

    def table(self, name: str) -> TableQuery:
        return TableQuery(self, name)

    def _seed_default_data(self):
        now_iso = datetime.now(timezone.utc).isoformat()
        factory_id = "10000000-0000-4000-8000-000000000001"
        proc_prep = "20000000-0000-4000-8000-000000000001"
        proc_cnc = "20000000-0000-4000-8000-000000000002"
        proc_surf = "20000000-0000-4000-8000-000000000003"
        proc_asmb = "20000000-0000-4000-8000-000000000004"

        mach_prep = "30000000-0000-4000-8000-000000000001"
        mach_cnc = "30000000-0000-4000-8000-000000000002"
        mach_surf = "30000000-0000-4000-8000-000000000003"
        mach_asmb = "30000000-0000-4000-8000-000000000004"

        self.tables["factories"] = [
            {
                "id": factory_id,
                "name": "Aero Systems Plant 01",
                "industry_type": "Aerospace",
                "location": "Bengaluru, IN",
                "description": "Demonstration facility with synthetic production and telemetry records.",
                "status": "active",
                "created_at": now_iso,
            }
        ]

        self.tables["processes"] = [
            {
                "id": proc_prep,
                "factory_id": factory_id,
                "name": "Material preparation",
                "description": "Cutting and preparation of incoming material.",
                "sequence_order": 1,
                "expected_cycle_time": 7.8,
                "capacity_per_hour": 72.0,
                "status": "active",
                "created_at": now_iso,
            },
            {
                "id": proc_cnc,
                "factory_id": factory_id,
                "name": "Precision machining",
                "description": "CNC machining for aerospace components.",
                "sequence_order": 2,
                "expected_cycle_time": 12.4,
                "capacity_per_hour": 58.0,
                "status": "active",
                "created_at": now_iso,
            },
            {
                "id": proc_surf,
                "factory_id": factory_id,
                "name": "Surface treatment",
                "description": "Protective surface finishing.",
                "sequence_order": 3,
                "expected_cycle_time": 9.6,
                "capacity_per_hour": 62.0,
                "status": "active",
                "created_at": now_iso,
            },
            {
                "id": proc_asmb,
                "factory_id": factory_id,
                "name": "Component assembly",
                "description": "Final assembly and fit checks.",
                "sequence_order": 4,
                "expected_cycle_time": 18.2,
                "capacity_per_hour": 44.0,
                "status": "delayed",
                "created_at": now_iso,
            },
        ]

        self.tables["machines"] = [
            {
                "id": mach_prep,
                "factory_id": factory_id,
                "process_id": proc_prep,
                "name": "Prep line M-01",
                "machine_type": "Cutting line",
                "status": "running",
                "capacity_per_hour": 72.0,
                "current_utilization": 72.0,
                "temperature": 61.2,
                "created_at": now_iso,
            },
            {
                "id": mach_cnc,
                "factory_id": factory_id,
                "process_id": proc_cnc,
                "name": "CNC cell M-02",
                "machine_type": "CNC mill",
                "status": "running",
                "capacity_per_hour": 58.0,
                "current_utilization": 88.0,
                "temperature": 68.5,
                "created_at": now_iso,
            },
            {
                "id": mach_surf,
                "factory_id": factory_id,
                "process_id": proc_surf,
                "name": "Finishing M-03",
                "machine_type": "Coating station",
                "status": "running",
                "capacity_per_hour": 62.0,
                "current_utilization": 64.0,
                "temperature": 54.8,
                "created_at": now_iso,
            },
            {
                "id": mach_asmb,
                "factory_id": factory_id,
                "process_id": proc_asmb,
                "name": "Assembly M-04",
                "machine_type": "Assembly cell",
                "status": "running",
                "capacity_per_hour": 44.0,
                "current_utilization": 96.0,
                "temperature": 71.4,
                "created_at": now_iso,
            },
        ]

        self.tables["machine_telemetry"] = [
            {
                "id": "40000000-0000-4000-8000-000000000001",
                "machine_id": mach_prep,
                "temperature": 61.2,
                "vibration": 0.18,
                "power_consumption": 12.4,
                "rotational_speed": 1480.0,
                "processing_time": 7.8,
                "recorded_at": now_iso,
                "data_source": "simulated",
            },
            {
                "id": "40000000-0000-4000-8000-000000000002",
                "machine_id": mach_cnc,
                "temperature": 68.5,
                "vibration": 0.31,
                "power_consumption": 18.8,
                "rotational_speed": 2100.0,
                "processing_time": 12.4,
                "recorded_at": now_iso,
                "data_source": "simulated",
            },
            {
                "id": "40000000-0000-4000-8000-000000000003",
                "machine_id": mach_surf,
                "temperature": 54.8,
                "vibration": 0.16,
                "power_consumption": 10.1,
                "rotational_speed": 1320.0,
                "processing_time": 9.6,
                "recorded_at": now_iso,
                "data_source": "simulated",
            },
            {
                "id": "40000000-0000-4000-8000-000000000004",
                "machine_id": mach_asmb,
                "temperature": 71.4,
                "vibration": 0.62,
                "power_consumption": 16.7,
                "rotational_speed": 980.0,
                "processing_time": 18.2,
                "recorded_at": now_iso,
                "data_source": "simulated",
            },
        ]

        self.tables["production_records"] = [
            {
                "id": "50000000-0000-4000-8000-000000000001",
                "process_id": proc_prep,
                "machine_id": mach_prep,
                "units_produced": 126,
                "units_defective": 2,
                "processing_time": 7.8,
                "downtime_minutes": 4.0,
                "recorded_at": now_iso,
            },
            {
                "id": "50000000-0000-4000-8000-000000000002",
                "process_id": proc_cnc,
                "machine_id": mach_cnc,
                "units_produced": 108,
                "units_defective": 3,
                "processing_time": 12.4,
                "downtime_minutes": 11.0,
                "recorded_at": now_iso,
            },
            {
                "id": "50000000-0000-4000-8000-000000000003",
                "process_id": proc_surf,
                "machine_id": mach_surf,
                "units_produced": 114,
                "units_defective": 1,
                "processing_time": 9.6,
                "downtime_minutes": 2.0,
                "recorded_at": now_iso,
            },
            {
                "id": "50000000-0000-4000-8000-000000000004",
                "process_id": proc_asmb,
                "machine_id": mach_asmb,
                "units_produced": 96,
                "units_defective": 5,
                "processing_time": 18.2,
                "downtime_minutes": 18.0,
                "recorded_at": now_iso,
            },
        ]

        self.tables["process_dependencies"] = [
            {
                "id": "60000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "source_process_id": proc_prep,
                "target_process_id": proc_cnc,
                "dependency_type": "sequential",
                "impact_factor": 0.72,
                "created_at": now_iso,
            },
            {
                "id": "60000000-0000-4000-8000-000000000002",
                "factory_id": factory_id,
                "source_process_id": proc_cnc,
                "target_process_id": proc_surf,
                "dependency_type": "sequential",
                "impact_factor": 0.68,
                "created_at": now_iso,
            },
            {
                "id": "60000000-0000-4000-8000-000000000003",
                "factory_id": factory_id,
                "source_process_id": proc_surf,
                "target_process_id": proc_asmb,
                "dependency_type": "sequential",
                "impact_factor": 0.81,
                "created_at": now_iso,
            },
        ]

        self.tables["inventory"] = [
            {
                "id": "70000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "process_id": proc_prep,
                "item_name": "Aluminium alloy billets",
                "item_type": "raw_material",
                "quantity": 840.0,
                "minimum_quantity": 240.0,
                "unit": "kg",
                "storage_temperature": 21.0,
                "storage_humidity": 42.0,
                "expiry_date": None,
                "updated_at": now_iso,
            },
            {
                "id": "70000000-0000-4000-8000-000000000002",
                "factory_id": factory_id,
                "process_id": proc_surf,
                "item_name": "Aerospace-grade coating",
                "item_type": "raw_material",
                "quantity": 56.0,
                "minimum_quantity": 70.0,
                "unit": "litres",
                "storage_temperature": 18.0,
                "storage_humidity": 40.0,
                "expiry_date": "2027-05-17T00:00:00Z",
                "updated_at": now_iso,
            },
            {
                "id": "70000000-0000-4000-8000-000000000003",
                "factory_id": factory_id,
                "process_id": proc_cnc,
                "item_name": "CNC tool insert set",
                "item_type": "spare_part",
                "quantity": 18.0,
                "minimum_quantity": 12.0,
                "unit": "units",
                "storage_temperature": None,
                "storage_humidity": None,
                "expiry_date": None,
                "updated_at": now_iso,
            },
            {
                "id": "70000000-0000-4000-8000-000000000004",
                "factory_id": factory_id,
                "process_id": proc_asmb,
                "item_name": "Torque calibration kit",
                "item_type": "tool",
                "quantity": 3.0,
                "minimum_quantity": 1.0,
                "unit": "units",
                "storage_temperature": None,
                "storage_humidity": None,
                "expiry_date": None,
                "updated_at": now_iso,
            },
        ]

        self.tables["predictions"] = [
            {
                "id": "80000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "process_id": proc_asmb,
                "machine_id": mach_asmb,
                "prediction_type": "bottleneck",
                "risk_level": "high",
                "probability": 0.82,
                "predicted_impact": "Assembly queue may delay downstream inspection.",
                "estimated_time_to_event": 28.0,
                "recommendation": "Review load balance with the shift supervisor.",
                "model_version": "demo-rules-1.0",
                "created_at": now_iso,
            },
            {
                "id": "80000000-0000-4000-8000-000000000002",
                "factory_id": factory_id,
                "process_id": proc_cnc,
                "machine_id": mach_cnc,
                "prediction_type": "anomaly",
                "risk_level": "medium",
                "probability": 0.64,
                "predicted_impact": "Vibration is above its recent illustrative baseline.",
                "estimated_time_to_event": 55.0,
                "recommendation": "Inspect the machine during the next planned pause.",
                "model_version": "demo-rules-1.0",
                "created_at": now_iso,
            },
        ]

        self.tables["alerts"] = [
            {
                "id": "90000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "machine_id": mach_asmb,
                "process_id": proc_asmb,
                "prediction_id": "80000000-0000-4000-8000-000000000001",
                "title": "Assembly cycle time elevated",
                "description": "Illustrative cycle time is 24% above the process baseline.",
                "severity": "critical",
                "status": "active",
                "created_at": now_iso,
                "resolved_at": None,
            },
            {
                "id": "90000000-0000-4000-8000-000000000002",
                "factory_id": factory_id,
                "machine_id": None,
                "process_id": proc_surf,
                "prediction_id": None,
                "title": "Coating reserve below minimum",
                "description": "A replenishment review is recommended for the next shift.",
                "severity": "warning",
                "status": "active",
                "created_at": now_iso,
                "resolved_at": None,
            },
        ]

        self.tables["interventions"] = [
            {
                "id": "a0000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "machine_id": mach_asmb,
                "process_id": proc_asmb,
                "prediction_id": "80000000-0000-4000-8000-000000000001",
                "intervention_type": "workload_shift",
                "description": "Review a portion of assembly work for a qualified alternate cell.",
                "status": "proposed",
                "expected_impact": "May reduce the assembly queue after supervisor review.",
                "actual_impact": None,
                "created_at": now_iso,
                "executed_at": None,
            },
            {
                "id": "a0000000-0000-4000-8000-000000000002",
                "factory_id": factory_id,
                "machine_id": mach_cnc,
                "process_id": None,
                "prediction_id": "80000000-0000-4000-8000-000000000002",
                "intervention_type": "maintenance",
                "description": "Inspect spindle and vibration readings during the next planned pause.",
                "status": "approved",
                "expected_impact": "May identify wear before the next scheduled service.",
                "actual_impact": None,
                "created_at": now_iso,
                "executed_at": None,
            },
        ]

        self.tables["simulation_runs"] = [
            {
                "id": "b0000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "scenario_name": "Shift 10% of assembly load",
                "input_parameters": {"utilization_delta": -6, "capacity_multiplier": 1.05},
                "baseline_metrics": {"average_utilization": 80.0, "capacity_per_hour": 236.0},
                "simulated_metrics": {"average_utilization": 74.0, "capacity_per_hour": 247.8},
                "recommendations": ["Review alternate-cell qualification before acting."],
                "status": "completed",
                "created_at": now_iso,
            }
        ]

        self.tables["factory_settings"] = [
            {
                "id": "c0000000-0000-4000-8000-000000000001",
                "factory_id": factory_id,
                "configuration": {
                    "timezone": "Asia/Kolkata",
                    "shift_hours": 8,
                    "industry_profile": "aerospace",
                },
                "alert_thresholds": {
                    "temperature_celsius": 82,
                    "vibration_mm_s": 0.7,
                    "inventory_days": 2,
                },
                "automation_enabled": False,
                "updated_at": now_iso,
            }
        ]
