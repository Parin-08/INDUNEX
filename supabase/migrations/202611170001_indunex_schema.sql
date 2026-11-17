create extension if not exists pgcrypto;

create table if not exists public.factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry_type text not null,
  location text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamptz not null default now()
);

create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  name text not null,
  description text not null default '',
  sequence_order integer not null check (sequence_order >= 0),
  expected_cycle_time numeric not null check (expected_cycle_time >= 0),
  capacity_per_hour numeric not null check (capacity_per_hour >= 0),
  status text not null default 'active' check (status in ('active', 'idle', 'delayed')),
  created_at timestamptz not null default now(),
  unique (factory_id, sequence_order),
  unique (id, factory_id)
);

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  process_id uuid not null,
  name text not null,
  machine_type text not null,
  status text not null default 'idle' check (status in ('running', 'idle', 'maintenance', 'fault')),
  capacity_per_hour numeric not null check (capacity_per_hour >= 0),
  current_utilization numeric not null default 0 check (current_utilization between 0 and 100),
  temperature numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (factory_id, name),
  unique (id, process_id),
  foreign key (process_id, factory_id) references public.processes(id, factory_id) on delete restrict
);

create table if not exists public.machine_telemetry (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  temperature numeric not null,
  vibration numeric not null check (vibration >= 0),
  power_consumption numeric not null check (power_consumption >= 0),
  rotational_speed numeric not null check (rotational_speed >= 0),
  processing_time numeric not null check (processing_time >= 0),
  recorded_at timestamptz not null default now(),
  data_source text not null default 'sensor' check (data_source in ('sensor', 'simulated'))
);

create table if not exists public.production_records (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  units_produced integer not null check (units_produced >= 0),
  units_defective integer not null default 0 check (units_defective >= 0 and units_defective <= units_produced),
  processing_time numeric not null check (processing_time >= 0),
  downtime_minutes numeric not null default 0 check (downtime_minutes >= 0),
  recorded_at timestamptz not null default now(),
  foreign key (machine_id, process_id) references public.machines(id, process_id) on delete cascade
);

create table if not exists public.process_dependencies (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  source_process_id uuid not null,
  target_process_id uuid not null,
  dependency_type text not null check (dependency_type in ('sequential', 'resource', 'conditional')),
  impact_factor numeric not null check (impact_factor between 0 and 1),
  created_at timestamptz not null default now(),
  check (source_process_id <> target_process_id),
  unique (factory_id, source_process_id, target_process_id),
  foreign key (source_process_id, factory_id) references public.processes(id, factory_id) on delete cascade,
  foreign key (target_process_id, factory_id) references public.processes(id, factory_id) on delete cascade
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  process_id uuid references public.processes(id) on delete set null,
  item_name text not null,
  item_type text not null check (item_type in ('raw_material', 'spare_part', 'component', 'tool')),
  quantity numeric not null check (quantity >= 0),
  minimum_quantity numeric not null default 0 check (minimum_quantity >= 0),
  unit text not null,
  storage_temperature numeric,
  storage_humidity numeric check (storage_humidity between 0 and 100),
  expiry_date timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  process_id uuid references public.processes(id) on delete set null,
  machine_id uuid references public.machines(id) on delete set null,
  prediction_type text not null check (prediction_type in ('bottleneck', 'failure', 'delay', 'anomaly')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  probability numeric not null check (probability between 0 and 1),
  predicted_impact text not null,
  estimated_time_to_event numeric check (estimated_time_to_event >= 0),
  recommendation text not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete set null,
  process_id uuid references public.processes(id) on delete set null,
  prediction_id uuid references public.predictions(id) on delete set null,
  title text not null,
  description text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'active' check (status in ('active', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete set null,
  process_id uuid references public.processes(id) on delete set null,
  prediction_id uuid references public.predictions(id) on delete set null,
  intervention_type text not null check (intervention_type in ('workload_shift', 'machine_adjustment', 'maintenance')),
  description text not null,
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'executed', 'rejected')),
  expected_impact text not null,
  actual_impact text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create table if not exists public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id) on delete cascade,
  scenario_name text not null,
  input_parameters jsonb not null default '{}'::jsonb,
  baseline_metrics jsonb not null default '{}'::jsonb,
  simulated_metrics jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.factory_settings (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null unique references public.factories(id) on delete cascade,
  configuration jsonb not null default '{}'::jsonb,
  alert_thresholds jsonb not null default '{}'::jsonb,
  automation_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists processes_factory_sequence_idx on public.processes(factory_id, sequence_order);
create index if not exists machines_factory_status_idx on public.machines(factory_id, status);
create index if not exists machines_process_idx on public.machines(process_id);
create index if not exists telemetry_machine_time_idx on public.machine_telemetry(machine_id, recorded_at desc);
create index if not exists production_process_time_idx on public.production_records(process_id, recorded_at desc);
create index if not exists production_machine_time_idx on public.production_records(machine_id, recorded_at desc);
create index if not exists dependencies_factory_idx on public.process_dependencies(factory_id);
create index if not exists inventory_factory_idx on public.inventory(factory_id);
create index if not exists predictions_factory_time_idx on public.predictions(factory_id, created_at desc);
create index if not exists alerts_factory_status_time_idx on public.alerts(factory_id, status, created_at desc);
create index if not exists interventions_factory_time_idx on public.interventions(factory_id, created_at desc);
create index if not exists simulation_runs_factory_time_idx on public.simulation_runs(factory_id, created_at desc);

alter table public.factories enable row level security;
alter table public.processes enable row level security;
alter table public.machines enable row level security;
alter table public.machine_telemetry enable row level security;
alter table public.production_records enable row level security;
alter table public.process_dependencies enable row level security;
alter table public.inventory enable row level security;
alter table public.predictions enable row level security;
alter table public.alerts enable row level security;
alter table public.interventions enable row level security;
alter table public.simulation_runs enable row level security;
alter table public.factory_settings enable row level security;

-- No anon/authenticated policies are created. The backend uses the server-only
-- service-role key; direct browser access is denied by RLS.
