import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, Bell, Boxes, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Cpu, Factory, Gauge,
  GitBranch, LayoutDashboard, Menu, PackageCheck, Play, Settings2, ShieldCheck,
  SlidersHorizontal, Wrench, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, Cell
} from "recharts";
import { api } from "./api";

const navigation = [
  { section: "WORKSPACE", items: [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Process flow", icon: GitBranch },
    { name: "Predictions", icon: Activity },
  ]},
  { section: "OPERATIONS", items: [
    { name: "Machines", icon: Gauge },
    { name: "Inventory", icon: Boxes },
    { name: "Alerts", icon: Bell },
    { name: "Simulator", icon: SlidersHorizontal },
  ]},
  { section: "CONTROL", items: [
    { name: "Interventions", icon: Wrench },
    { name: "Factory settings", icon: Settings2 },
  ]},
];

const shortTime = (value) => value
  ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "—";

const fullTime = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const humanize = (value = "") => value.replaceAll("_", " ");

function Sidebar({ active, onNavigate, open, onClose }) {
  return <>
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><span /><span /><span /></div>
        <div><b>INDUNEX</b><small>FACTORY OPERATIONS</small></div>
        <button className="mobile-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>
      </div>
      <div className="workspace-label">CURRENT WORKSPACE</div>
      <div className="workspace-switch"><span className="workspace-icon"><Factory size={17} /></span><span><b>Operations hub</b><small>Production environment</small></span><ChevronDown size={15} /></div>
      <nav aria-label="Main navigation">
        {navigation.map((group) => <div className="nav-group" key={group.section}>
          <div className="nav-label">{group.section}</div>
          {group.items.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${active === name ? "active" : ""}`} onClick={() => { onNavigate(name); onClose(); }}>
            <Icon size={17} /><span>{name}</span>{name === "Alerts" && <span className="nav-count">•</span>}
          </button>)}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-status"><span className="status-live" /><span><b>System status</b><small>All services operational</small></span><Check size={15} /></div>
        <div className="profile"><div className="avatar">OP</div><div><b>Operations team</b><small>Facility workspace</small></div><ChevronDown size={15} /></div>
      </div>
    </aside>
    {open && <button className="mobile-overlay" onClick={onClose} aria-label="Close navigation" />}
  </>;
}

function Header({ factory, factories, onFactoryChange, onMenu }) {
  return <header className="topbar">
    <div className="top-left">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="breadcrumbs">Operations <ChevronRight size={14} /> <b>Facility console</b></div>
    </div>
    <div className="top-actions">
      <div className="environment-pill"><span /> DEMONSTRATION</div>
      <label className="factory-select"><Factory size={16} /><select aria-label="Select facility" value={factory?.id || ""} onChange={(event) => onFactoryChange(event.target.value)}>
        {factories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select><ChevronDown size={14} /></label>
      <span className="top-divider" />
      <div className="top-avatar">OP</div>
    </div>
  </header>;
}

function PageHeading({ factory, title, description, actions }) {
  return <div className="page-title-row">
    <div>
      <div className="eyebrow"><span className="eyebrow-dot" />{factory?.industry_type?.toUpperCase()} <span className="eyebrow-separator">/</span> {factory?.location?.toUpperCase()}</div>
      <h1>{title}</h1><p>{description}</p>
    </div>
    {actions && <div className="page-controls">{actions}</div>}
  </div>;
}

function MetricCard({ label, value, note, icon: Icon, tone }) {
  return <article className="metric-card">
    <div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={18} /></div></div>
    <div className="metric-value">{value}</div><div className="metric-foot"><span>{note}</span></div>
  </article>;
}

function PanelHeading({ title, description, action }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function Overview({ data, onNavigate }) {
  const metrics = data.metrics || {};
  const chartData = useMemo(() => [...(data.production || [])].reverse().map((row) => ({
    ...row,
    time: shortTime(row.recorded_at),
  })), [data.production]);
  const machineData = (data.machines || []).map((machine) => ({
    name: machine.name.replace(/^.*\s/, ""),
    load: Number(machine.current_utilization || 0),
    state: machine.status,
  }));
  return <>
    <div className="metric-grid">
      <MetricCard label="Units recorded" value={Number(metrics.units_produced || 0).toLocaleString()} note="Production records in the latest sample" icon={PackageCheck} tone="green" />
      <MetricCard label="Machines running" value={`${metrics.machines_running || 0} / ${metrics.machines_total || 0}`} note="Current reported machine state" icon={Cpu} tone="blue" />
      <MetricCard label="Average utilisation" value={`${metrics.average_utilization_percent ?? 0}%`} note="Across listed facility machines" icon={Gauge} tone="violet" />
      <MetricCard label="Active alerts" value={metrics.active_alerts || 0} note={`${metrics.high_risk_predictions || 0} high-risk predictions`} icon={AlertTriangle} tone="orange" />
    </div>
    <section className="panel">
      <PanelHeading title="Production flow" description="Stage status and assigned equipment" action={<button className="text-button" onClick={() => onNavigate("Process flow")}>Open process flow <ArrowRight size={14} /></button>} />
      <div className="pipeline-list">
        {(data.processes || []).map((process, index) => {
          const processMachine = (data.machines || []).find((machine) => machine.process_id === process.id);
          const tone = process.status === "delayed" ? "risk" : process.status === "idle" ? "muted" : "good";
          return <div className="process-row" key={process.id}>
            <div className={`process-number tone-${index % 4}`}>{String(process.sequence_order).padStart(2, "0")}</div>
            <div className="process-info"><b>{process.name}</b><small>{processMachine?.name || "No machine assigned"}</small></div>
            <div className="process-capacity"><span>{process.capacity_per_hour} units/hr</span><small>{process.expected_cycle_time} min cycle</small></div>
            <div className={`status-chip ${tone}`}><span />{humanize(process.status)}</div>
          </div>;
        })}
      </div>
      <div className="panel-footnote"><span className="legend-dot green-dot" />Reported operational status<span>Values shown are records from this facility.</span></div>
    </section>
    <div className="analytics-grid">
      <section className="panel chart-panel">
        <PanelHeading title="Recent production" description="Output in the latest recorded production periods" />
        {chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs><linearGradient id="unitsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f796f" stopOpacity={0.22} /><stop offset="100%" stopColor="#2f796f" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid stroke="#e9eeeb" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#829089" }} axisLine={false} tickLine={false} dy={9} />
          <YAxis tick={{ fontSize: 11, fill: "#829089" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ border: "1px solid #e3e9e5", borderRadius: 8, fontSize: 12 }} formatter={(value) => [`${value} units`, "Output"]} />
          <Area type="monotone" dataKey="units_produced" stroke="#347d70" strokeWidth={2.5} fill="url(#unitsFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
        </AreaChart></ResponsiveContainer></div> : <EmptyState text="Production readings will appear here when records are available." />}
      </section>
      <section className="panel machine-panel">
        <PanelHeading title="Machine utilisation" description="Latest reported load by machine" action={<button className="text-button" onClick={() => onNavigate("Machines")}>Machine list <ArrowRight size={14} /></button>} />
        {machineData.length ? <div className="machine-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={machineData} margin={{ top: 12, right: 2, left: -24, bottom: 0 }} barSize={22}>
          <CartesianGrid stroke="#e9eeeb" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#829089" }} axisLine={false} tickLine={false} dy={8} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#829089" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ border: "1px solid #e3e9e5", borderRadius: 8, fontSize: 12 }} formatter={(value) => [`${value}%`, "Utilisation"]} />
          <Bar dataKey="load" radius={[5, 5, 0, 0]}>{machineData.map((item) => <Cell key={item.name} fill={item.state === "fault" ? "#b35b46" : item.state === "maintenance" ? "#c58c42" : item.state === "idle" ? "#aebbb4" : "#4e9283"} />)}</Bar>
        </BarChart></ResponsiveContainer></div> : <EmptyState text="Machine readings will appear here." />}
      </section>
    </div>
    <AlertsList alerts={(data.alerts || []).slice(0, 4)} compact onViewAll={() => onNavigate("Alerts")} />
    <div className="bottom-note"><div className="note-icon"><ShieldCheck size={17} /></div><div><b>Operator-led actions</b><span>Recommendations support review. No action is sent to machine controls.</span></div><button onClick={() => onNavigate("Interventions")}>Review interventions <ArrowRight size={14} /></button></div>
  </>;
}

function EmptyState({ text }) {
  return <div className="empty-state"><Activity size={19} /><span>{text}</span></div>;
}

function AlertsList({ alerts, compact = false, onViewAll }) {
  return <section className="panel alerts-panel">
    <PanelHeading title="Operations alerts" description="Facility warnings and production signals" action={onViewAll && <button className="text-button" onClick={onViewAll}>View all <ArrowRight size={14} /></button>} />
    {alerts.length ? <div className="alert-list">{alerts.map((alert) => <div className="alert-row" key={alert.id}>
      <div className={`alert-symbol ${alert.severity}`}>{alert.severity === "critical" ? <AlertTriangle size={17} /> : alert.severity === "warning" ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />}</div>
      <div className="alert-copy"><div className="alert-title-line"><b>{alert.title}</b><span className={`alert-tag ${alert.severity}`}>{humanize(alert.severity)}</span></div><p>{alert.description}</p><small>{fullTime(alert.created_at)}</small></div>
    </div>)}</div> : <EmptyState text="There are no alerts for this facility." />}
    {!compact && <div className="panel-footnote"><span>Alert status is managed in the backend alert workflow.</span></div>}
  </section>;
}

function ProcessFlow({ processes, dependencies, machines }) {
  return <section className="panel process-map">
    <PanelHeading title="Production sequence" description="Process stages connected by their recorded dependencies" />
    {!processes.length ? <EmptyState text="No process stages are configured for this facility." /> : <div className="flow-list">
      {processes.map((process, index) => {
        const machine = machines.find((item) => item.process_id === process.id);
        const outgoing = dependencies.filter((dependency) => dependency.source_process_id === process.id);
        return <article className="flow-card" key={process.id}>
          <div className="flow-index">{String(process.sequence_order).padStart(2, "0")}</div>
          <div className="flow-content"><div className="flow-title"><h3>{process.name}</h3><span className={`status-chip ${process.status === "delayed" ? "risk" : "good"}`}><span />{humanize(process.status)}</span></div>
            <p>{process.description || "No process description supplied."}</p>
            <div className="flow-meta"><span><Clock3 size={13} />{process.expected_cycle_time} min cycle</span><span><Gauge size={13} />{process.capacity_per_hour} units/hr</span><span><Cpu size={13} />{machine?.name || "No assigned machine"}</span></div>
            {outgoing.length > 0 && <div className="dependency-tags">{outgoing.map((item) => <span key={item.id}>Feeds {processes.find((next) => next.id === item.target_process_id)?.name || "next stage"} · {Math.round(item.impact_factor * 100)}% impact</span>)}</div>}
          </div>
          {index < processes.length - 1 && <div className="flow-connector" />}
        </article>;
      })}
    </div>}
  </section>;
}

function Machines({ machines, telemetry, processes }) {
  const latest = useMemo(() => {
    const result = {};
    for (const reading of telemetry) {
      if (!result[reading.machine_id] || reading.recorded_at > result[reading.machine_id].recorded_at) result[reading.machine_id] = reading;
    }
    return result;
  }, [telemetry]);
  return <section className="panel table-panel">
    <PanelHeading title="Machine register" description="Equipment state and most recent available telemetry" />
    <div className="table-scroll"><table><thead><tr><th>Machine</th><th>Process</th><th>Status</th><th>Utilisation</th><th>Temperature</th><th>Vibration</th><th>Reading source</th></tr></thead>
      <tbody>{machines.map((machine) => {
        const reading = latest[machine.id];
        const processName = processes.find((process) => process.id === machine.process_id)?.name || "Unassigned process";
        return <tr key={machine.id}><td><b>{machine.name}</b><small>{machine.machine_type}</small></td><td>{processName}</td>
          <td><span className={`table-status ${machine.status}`}>{humanize(machine.status)}</span></td><td>{machine.current_utilization}%</td>
          <td>{reading ? `${reading.temperature} °C` : "—"}</td><td>{reading ? reading.vibration : "—"}</td>
          <td>{reading ? <span className={`source-badge ${reading.data_source}`}>{reading.data_source === "simulated" ? "Simulated" : "Sensor"}</span> : <span className="muted-text">No readings</span>}</td></tr>;
      })}</tbody></table></div>
    {machines.length === 0 && <EmptyState text="No machines are configured for this facility." />}
    <div className="panel-footnote"><span>Telemetry provenance is reported per reading; simulated data is not labelled as live.</span></div>
  </section>;
}

function PredictionList({ predictions, onEvaluate, busy }) {
  return <section className="panel">
    <PanelHeading title="Predicted operational risks" description="Probability values are between 0 and 1 and come from stored model output" action={<button className="secondary-button" disabled={busy} onClick={onEvaluate}><Activity size={14} />{busy ? "Assessing readings…" : "Assess latest readings"}</button>} />
    {predictions.length ? <div className="prediction-list">{predictions.map((item) => <article className="prediction-card" key={item.id}>
      <div className={`prediction-marker ${item.risk_level}`}><Activity size={16} /></div>
      <div className="prediction-body"><div className="prediction-heading"><h3>{humanize(item.prediction_type)}</h3><span className={`risk-label ${item.risk_level}`}>{humanize(item.risk_level)} risk</span></div>
        <p>{item.predicted_impact}</p><div className="prediction-details"><span>Probability <b>{(Number(item.probability) * 100).toFixed(0)}%</b></span><span>Model {item.model_version}</span>{item.estimated_time_to_event != null && <span>Estimated in {item.estimated_time_to_event} min</span>}</div><div className="recommendation-line"><b>Suggested review</b><span>{item.recommendation}</span></div>
      </div>
    </article>)}</div> : <EmptyState text="No predictions have been recorded for this facility." />}
  </section>;
}

function Inventory({ inventory }) {
  return <section className="panel table-panel">
    <PanelHeading title="Materials and spares" description="Available quantity compared with facility reserve levels" />
    <div className="inventory-grid">{inventory.map((item) => {
      const percent = item.minimum_quantity ? Math.min(100, (item.quantity / item.minimum_quantity) * 100) : 100;
      const low = item.quantity < item.minimum_quantity;
      return <article className={`inventory-card ${low ? "inventory-low" : ""}`} key={item.id}>
        <div className="inventory-card-top"><div className="inventory-icon"><Boxes size={17} /></div><span className={`inventory-status ${low ? "risk" : "good"}`}>{low ? "Below reserve" : "In stock"}</span></div>
        <h3>{item.item_name}</h3><p>{humanize(item.item_type)}{item.expiry_date ? ` · Expires ${new Date(item.expiry_date).toLocaleDateString()}` : ""}</p>
        <div className="inventory-quantity"><b>{Number(item.quantity).toLocaleString()}</b><span>{item.unit} available</span></div>
        <div className="inventory-meter"><span style={{ width: `${percent}%` }} /></div><small>Minimum reserve: {item.minimum_quantity} {item.unit}</small>
      </article>;
    })}</div>
    {inventory.length === 0 && <EmptyState text="No inventory has been recorded for this facility." />}
  </section>;
}

function AlertsPage({ alerts }) {
  return <AlertsList alerts={alerts} />;
}

function Simulator({ factory, result, onRun, busy }) {
  const [delta, setDelta] = useState(-6);
  const [scenario, setScenario] = useState("Shift load between work cells");
  return <div className="simulator-layout">
    <section className="panel simulator-form">
      <PanelHeading title="Scenario inputs" description="Evaluate an illustrative adjustment against current facility metrics" />
      <label className="field-label">Scenario name<input value={scenario} onChange={(event) => setScenario(event.target.value)} maxLength={120} /></label>
      <label className="field-label">Utilisation adjustment <b>{delta > 0 ? "+" : ""}{delta} points</b><input type="range" min="-20" max="20" value={delta} onChange={(event) => setDelta(Number(event.target.value))} /><span className="field-hint">This simulation changes an estimate only; it does not alter equipment settings.</span></label>
      <button className="primary-button" disabled={busy || !scenario.trim()} onClick={() => onRun({ factory_id: factory.id, scenario_name: scenario.trim(), input_parameters: { utilization_delta: delta, capacity_multiplier: 1.05 } })}><Play size={15} />{busy ? "Running scenario…" : "Run simulation"}</button>
    </section>
    <section className="panel simulator-result">
      <PanelHeading title="Simulation result" description="Saved scenario metrics returned by the backend" />
      {result ? <><div className="simulation-status"><span className="status-chip good"><span />{humanize(result.status)}</span><small>{fullTime(result.created_at)}</small></div>
        <div className="result-comparison"><div><small>Baseline utilisation</small><b>{result.baseline_metrics?.average_utilization ?? "—"}%</b></div><ArrowRight size={18} /><div><small>Scenario utilisation</small><b>{result.simulated_metrics?.average_utilization ?? "—"}%</b></div></div>
        <div className="result-comparison"><div><small>Baseline capacity</small><b>{result.baseline_metrics?.capacity_per_hour ?? "—"} <small>units/hr</small></b></div><ArrowRight size={18} /><div><small>Scenario capacity</small><b>{result.simulated_metrics?.capacity_per_hour ?? "—"} <small>units/hr</small></b></div></div>
        <div className="simulation-note"><ShieldCheck size={16} />Recommendations are informational and require an operator's independent review.</div>
      </> : <EmptyState text="Choose inputs and run a scenario to see its estimated result." />}
    </section>
  </div>;
}

function InterventionList({ interventions, machines, factoryId, onRefresh, onAction, busy }) {
  const [showForm, setShowForm] = useState(false);
  const [machineId, setMachineId] = useState("");
  const [description, setDescription] = useState("");
  const [expectedImpact, setExpectedImpact] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const saved = await onAction(() => api.previewIntervention({
      factory_id: factoryId,
      machine_id: machineId || null,
      intervention_type: "workload_shift",
      description,
      expected_impact: expectedImpact,
    }));
    if (!saved) return;
    setDescription(""); setExpectedImpact(""); setShowForm(false);
  };
  return <>
    <section className="panel">
      <PanelHeading title="Action review" description="Proposals require explicit approval before a demo execution can be recorded" action={<button className="secondary-button" onClick={() => setShowForm((value) => !value)}><Wrench size={14} />{showForm ? "Cancel proposal" : "New proposal"}</button>} />
      {showForm && <form className="proposal-form" onSubmit={submit}>
        <label className="field-label">Affected machine<select value={machineId} onChange={(event) => setMachineId(event.target.value)}><option value="">Facility-level</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select></label>
        <label className="field-label">Proposed action<input required minLength={1} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the operator-reviewed action" /></label>
        <label className="field-label">Expected impact<input required minLength={1} maxLength={1000} value={expectedImpact} onChange={(event) => setExpectedImpact(event.target.value)} placeholder="Expected operational outcome" /></label>
        <button className="primary-button" disabled={busy}><Check size={15} />Save proposal for review</button>
      </form>}
      <div className="intervention-list">{interventions.map((item) => <article className="intervention-row" key={item.id}>
        <div className={`intervention-icon ${item.status}`}><Wrench size={16} /></div><div className="intervention-copy"><div className="prediction-heading"><h3>{humanize(item.intervention_type)}</h3><span className={`workflow-status ${item.status}`}>{humanize(item.status)}</span></div>
          <p>{item.description}</p><small>Expected: {item.expected_impact}</small>{item.actual_impact && <small className="actual-impact">{item.actual_impact}</small>}</div>
        <div className="intervention-actions">
          {item.status === "proposed" && <button disabled={busy} className="secondary-button" onClick={() => onAction(() => api.approveIntervention(item.id, factoryId), onRefresh)}>Approve</button>}
          {item.status === "approved" && <button disabled={busy} className="primary-button" onClick={() => onAction(() => api.executeIntervention(item.id, factoryId), onRefresh)}>Record execution</button>}
        </div>
      </article>)}</div>
      {!interventions.length && <EmptyState text="There are no intervention proposals for this facility." />}
      <div className="safety-notice"><ShieldCheck size={16} /><span>Demo execution only updates the intervention record. This application does not send commands to industrial equipment.</span></div>
    </section>
  </>;
}

function SettingsPanel({ settings, onSave, busy }) {
  const [automation, setAutomation] = useState(settings?.automation_enabled || false);
  const [configuration, setConfiguration] = useState(JSON.stringify(settings?.configuration || {}, null, 2));
  const [thresholds, setThresholds] = useState(JSON.stringify(settings?.alert_thresholds || {}, null, 2));
  const submit = (event) => {
    event.preventDefault();
    try {
      onSave(settings.id, {
        automation_enabled: automation,
        configuration: JSON.parse(configuration),
        alert_thresholds: JSON.parse(thresholds),
      });
    } catch {
      onSave(null, null, "Configuration and thresholds must be valid JSON.");
    }
  };
  if (!settings) return <section className="panel"><EmptyState text="No settings record is configured for this facility." /></section>;
  return <form className="panel settings-form" onSubmit={submit}>
    <PanelHeading title="Facility configuration" description="Edit the JSON configuration and alert threshold values stored for this facility." />
    <div className="settings-grid"><label className="field-label">Configuration (JSON)<textarea rows="9" value={configuration} onChange={(event) => setConfiguration(event.target.value)} spellCheck="false" /></label>
      <label className="field-label">Alert thresholds (JSON)<textarea rows="9" value={thresholds} onChange={(event) => setThresholds(event.target.value)} spellCheck="false" /></label></div>
    <label className="toggle-field"><input type="checkbox" checked={automation} onChange={(event) => setAutomation(event.target.checked)} /><span><b>Automation enabled</b><small>Demo configuration only. Enabling this does not connect to machine controls.</small></span></label>
    <button className="primary-button" disabled={busy}>Save settings</button>
  </form>;
}

const pageDetails = {
  Overview: ["Facility overview", "A practical view of production, equipment condition and open operational issues."],
  "Process flow": ["Process flow", "Production sequence, stage capacity and upstream/downstream dependencies."],
  Predictions: ["Predictions", "Stored risk estimates and suggested reviews for the selected facility."],
  Machines: ["Machines & telemetry", "Equipment status and latest readings, with simulated values explicitly identified."],
  Inventory: ["Materials & inventory", "Materials and spare-part availability against facility reserve levels."],
  Alerts: ["Alerts", "Current facility warnings and production anomalies."],
  Simulator: ["What-if simulator", "Compare an illustrative scenario with current recorded facility metrics."],
  Interventions: ["Intervention review", "Review proposed actions and record approvals before demo execution."],
  "Factory settings": ["Factory settings", "Facility-specific operating configuration and alert thresholds."],
};

export default function App() {
  const [active, setActive] = useState("Overview");
  const [factories, setFactories] = useState([]);
  const [factoryId, setFactoryId] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const requestSequence = useRef(0);
  const factory = factories.find((item) => item.id === factoryId);
  const telemetrySources = [...new Set((data.telemetry || []).map((reading) => reading.data_source))];
  const telemetryLabel = telemetrySources.length > 1
    ? "MIXED TELEMETRY"
    : telemetrySources[0] === "simulated"
      ? "SIMULATED TELEMETRY"
      : telemetrySources[0] === "sensor"
        ? "SENSOR TELEMETRY"
        : "SOURCE UNVERIFIED";

  const loadFactories = useCallback(async () => {
    try {
      const result = await api.factories();
      setFactories(result);
      setFactoryId((current) => current && result.some((item) => item.id === current) ? current : result[0]?.id || "");
      if (!result.length) setLoading(false);
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!factoryId) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const requests = [
        api.overview(factoryId),
        api.processes(factoryId),
        api.dependencies(factoryId),
        api.machines(factoryId),
        api.telemetry(factoryId),
        api.predictions(factoryId),
        api.alerts(factoryId),
        api.inventory(factoryId),
        api.interventions(factoryId),
        api.settings(factoryId),
      ];
      const [overview, processes, dependencies, machines, telemetry, predictions, alerts, inventory, interventions, settings] = await Promise.all(requests);
      if (requestId === requestSequence.current) {
        setData({ overview, processes, dependencies, machines, telemetry, predictions, alerts, inventory, interventions, settings });
      }
    } catch (requestError) {
      if (requestId === requestSequence.current) setError(requestError.message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [factoryId]);

  useEffect(() => { loadFactories(); }, [loadFactories]);
  useEffect(() => { if (factoryId) refresh(); }, [factoryId, refresh]);

  const runAction = async (action, callback) => {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (callback) callback(result);
      return result;
    } catch (requestError) {
      setError(requestError.message || "The requested operation failed.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const notify = (message) => { if (message) setError(message); };
  const saveSettings = (id, body, validationError) => {
    if (validationError) return notify(validationError);
    runAction(() => api.saveSettings(id, factoryId, body), refresh);
  };

  const overview = data.overview || {};
  const titleAndDescription = pageDetails[active] || pageDetails.Overview;
  const pageContent = (() => {
    if (loading && !data.overview) return <div className="loading-panel"><span className="loading-ring" />Loading facility records…</div>;
    switch (active) {
      case "Overview": return data.overview && <Overview data={overview} onNavigate={setActive} />;
      case "Process flow": return <ProcessFlow processes={data.processes || []} dependencies={data.dependencies || []} machines={data.machines || []} />;
      case "Predictions": return <PredictionList predictions={data.predictions || []} busy={busy} onEvaluate={() => runAction(() => api.evaluatePredictions(factoryId), refresh)} />;
      case "Machines": return <Machines machines={data.machines || []} telemetry={data.telemetry || []} processes={data.processes || []} />;
      case "Inventory": return <Inventory inventory={data.inventory || []} />;
      case "Alerts": return <AlertsPage alerts={data.alerts || []} />;
      case "Simulator": return <Simulator key={factoryId} factory={factory} result={simulation?.factory_id === factoryId ? simulation : null} busy={busy} onRun={(body) => runAction(() => api.simulate(body), setSimulation)} />;
      case "Interventions": return <InterventionList interventions={data.interventions || []} machines={data.machines || []} factoryId={factoryId} onRefresh={refresh} busy={busy} onAction={(action, callback) => runAction(action, callback || refresh)} />;
      case "Factory settings": return <SettingsPanel key={`${data.settings?.id}-${data.settings?.updated_at}`} settings={data.settings} busy={busy} onSave={saveSettings} />;
      default: return null;
    }
  })();

  return <div className="app-shell">
    <Sidebar active={active} onNavigate={setActive} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="main-area">
      <Header factory={factory} factories={factories} onFactoryChange={setFactoryId} onMenu={() => setSidebarOpen(true)} />
      <div className="page-content">
        <PageHeading factory={factory} title={titleAndDescription[0]} description={titleAndDescription[1]} actions={<>
          <span className={`data-mode-pill ${telemetrySources[0] || "unknown"}`}><span />{telemetryLabel}</span>
          <button className="export-button" onClick={() => window.print()}><ArrowDownToLine size={15} /> Export</button>
        </>} />
        {error && <div className="error-banner" role="alert"><AlertTriangle size={16} /><span>{error}</span><button onClick={() => { setError(""); refresh(); }} aria-label="Dismiss error"><X size={15} /></button></div>}
        {!error && loading && data.overview && <div className="refresh-indicator"><span className="loading-ring" />Refreshing facility records</div>}
        {factories.length === 0 && !loading && !error ? <div className="panel"><EmptyState text="No facilities are available. Confirm that Supabase is configured and the sample data has been loaded." /></div> : pageContent}
        <footer><span>INDUNEX · Factory operations workspace</span><span><CircleHelp size={13} /> Demonstration records are illustrative; review source labels before operational use.</span></footer>
      </div>
    </main>
  </div>;
}
