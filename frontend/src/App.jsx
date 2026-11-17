
import React, { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Boxes, Building2, Check,
  ChevronDown, ChevronRight, CircleDot, ClipboardList, Copy, Cpu, Download,
  Factory, Gauge, GitBranch, LayoutDashboard, Menu, Moon, Package, Pencil,
  Play, Plus, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Sparkles, Sun, Thermometer, Trash2, TrendingUp, Warehouse, Wrench, X, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { factories, processes, productionTrend, alerts as initialAlerts } from "./data";
import "./styles.css";

const STORE = {
  inventory: "indunex-local-inventory-v1",
  machines: "indunex-local-machines-v1",
  alerts: "indunex-local-alerts-v1"
};

function useLocalData(key, fallback = []) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });

  const update = next => {
    setItems(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.error("Could not save local data:", error);
    }
  };

  return [items, update];
}

const industryFields = {
  Aerospace: [["partNumber", "Part number"], ["materialGrade", "Material grade"], ["certification", "Certification"], ["inspectionStatus", "Inspection status"]],
  Automotive: [["partNumber", "Part number"], ["materialGrade", "Material grade"], ["supplier", "Supplier"], ["vehicleProgram", "Vehicle programme"]],
  Electronics: [["componentCode", "Component code"], ["moistureSensitivity", "Moisture sensitivity level"], ["esdClass", "ESD class"], ["supplier", "Supplier"]],
  Pharmaceutical: [["batchNumber", "Batch number"], ["storageClass", "Storage class"], ["supplier", "Supplier"], ["expiryDate", "Expiry date"]],
  Textile: [["fabricType", "Fabric type"], ["composition", "Composition"], ["dyeLot", "Dye lot"], ["supplier", "Supplier"]]
};

const emptyInventory = {
  name: "", category: "Raw material", quantity: "", minimum: "", unit: "kg",
  storage: "", temperature: "", humidity: "", expiry: "", process: "", notes: ""
};

const emptyMachine = {
  name: "", type: "", assetTag: "", manufacturer: "", process: "", status: "Running",
  capacity: "", utilisation: "", temperature: "", maxTemperature: "", maintenanceDays: ""
};

const seedMachines = [
  { id: "m-01", factoryId: "plant-01", name: "CNC Mill · M-01", type: "CNC machining centre", assetTag: "AERO-CNC-01", manufacturer: "Demo manufacturer", process: "Precision machining", status: "Running", capacity: 42, utilisation: 72, temperature: 68, maxTemperature: 85, maintenanceDays: 30 },
  { id: "m-02", factoryId: "plant-01", name: "Assembly Cell · M-02", type: "Automated assembly", assetTag: "AERO-ASM-02", manufacturer: "Demo manufacturer", process: "Component assembly", status: "At risk", capacity: 36, utilisation: 96, temperature: 82, maxTemperature: 85, maintenanceDays: 14 },
  { id: "m-03", factoryId: "plant-01", name: "Inspection Unit · M-03", type: "Optical inspection", assetTag: "AERO-QA-03", manufacturer: "Demo manufacturer", process: "Quality inspection", status: "Running", capacity: 55, utilisation: 58, temperature: 44, maxTemperature: 75, maintenanceDays: 45 }
];

const modelOneFields = [
  { key: "Type", label: "Machine / product type", type: "text", placeholder: "Use the model's expected type code", hint: "Enter the exact categorical value used during training." },
  { key: "Air temperature [K]", label: "Air temperature", unit: "K", type: "number", placeholder: "e.g. 300.0" },
  { key: "Process temperature [K]", label: "Process temperature", unit: "K", type: "number", placeholder: "e.g. 310.0" },
  { key: "Rotational speed [rpm]", label: "Rotational speed", unit: "rpm", type: "number", placeholder: "e.g. 1500" },
  { key: "Torque [Nm]", label: "Torque", unit: "Nm", type: "number", placeholder: "e.g. 40" },
  { key: "Tool wear [min]", label: "Tool wear", unit: "min", type: "number", placeholder: "e.g. 120" }
];

const modelTwoFields = [
  { key: "actual_cycle_time_avg_seconds", label: "Actual cycle time · average", unit: "s", type: "number" },
  { key: "actual_cycle_time_std_seconds", label: "Actual cycle time · standard deviation", unit: "s", type: "number" },
  { key: "actual_cycle_time_max_seconds", label: "Actual cycle time · maximum", unit: "s", type: "number" },
  { key: "takt_time_seconds", label: "Takt time", unit: "s", type: "number" },
  { key: "designed_cycle_time_seconds", label: "Designed cycle time", unit: "s", type: "number" },
  { key: "wip_queue_avg_units", label: "WIP queue · average", unit: "units", type: "number" },
  { key: "wip_queue_max_units", label: "WIP queue · maximum", unit: "units", type: "number" },
  { key: "downtime_unplanned_minutes", label: "Unplanned downtime", unit: "min", type: "number" },
  { key: "throughput_rate_actual_uph", label: "Actual throughput rate", unit: "units/hr", type: "number" },
  { key: "throughput_rate_design_uph", label: "Designed throughput rate", unit: "units/hr", type: "number" },
  { key: "equipment_condition_score", label: "Equipment condition score", type: "number" },
  { key: "equipment_age_years", label: "Equipment age", unit: "years", type: "number" },
  { key: "operator_utilisation_pct", label: "Operator utilisation", unit: "%", type: "number" },
  { key: "operator_headcount_actual", label: "Actual operator headcount", unit: "people", type: "number", step: "1" },
  { key: "line_type", label: "Line type", type: "text", placeholder: "Model-supported category" },
  { key: "automation_level", label: "Automation level", type: "text", placeholder: "Model-supported category" },
  { key: "line_configuration", label: "Line configuration", type: "text", placeholder: "Model-supported category" }
];

const initialModelOne = Object.fromEntries(modelOneFields.map(f => [f.key, ""]));
const initialModelTwo = Object.fromEntries(modelTwoFields.map(f => [f.key, ""]));

function Sidebar({ active, setActive, open, setOpen }) {
  const groups = [
    { label: "COMMAND", items: [["Overview", LayoutDashboard], ["Process intelligence", GitBranch], ["Predictive insights", Sparkles], ["Model Inputs", SlidersHorizontal]] },
    { label: "OPERATIONS", items: [["Machines", Cpu], ["Inventory", Boxes], ["What-if simulator", SlidersHorizontal]] },
    { label: "CONTROL", items: [["Interventions", Wrench], ["Factory settings", Settings2]] }
  ];

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand-row">
        <div className="brand-mark"><span/><span/><span/></div>
        <div className="brand-wordmark"><b>INDUNEX</b><small>INDUSTRIAL INTELLIGENCE</small></div>
        <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18}/></button>
      </div>

      <div className="sidebar-workspace-label">ACTIVE WORKSPACE</div>
      <div className="workspace-switch">
        <div className="workspace-icon"><Factory size={17}/></div>
        <div className="workspace-switch-copy"><b>Operations hub</b><small>Local demo environment</small></div>
        <ChevronDown size={15}/>
      </div>

      <nav className="sidebar-nav">
        {groups.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map(([name, Icon]) => (
              <button key={name} className={`nav-item ${active === name ? "active" : ""}`} onClick={() => { setActive(name); setOpen(false); }}>
                <Icon size={17}/><span>{name}</span>
                {name === "Predictive insights" && <i className="nav-live-dot"/>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-connection"><span className="status-dot"/> LOCAL WORKSPACE <b>CONNECTED</b></div>
        <div className="profile-row"><div className="avatar">PA</div><div><b>Project Admin</b><small>Demo account</small></div><span className="profile-menu">···</span></div>
      </div>
    </aside>
  );
}

function Header({ factory, setFactory, setSidebarOpen, theme, setTheme, active }) {
  return (
    <header className="topbar">
      <div className="top-left">
        <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><b>{active}</b></div>
      </div>
      <div className="top-actions">
        <div className="top-status"><span className="status-dot"/> DEMO ENVIRONMENT</div>
        <label className="factory-select"><Building2 size={16}/><select value={factory} onChange={e => setFactory(e.target.value)}>{factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><ChevronDown size={14}/></label>
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme" title="Toggle theme">{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button>
        <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button>
        <div className="top-avatar">PA</div>
      </div>
    </header>
  );
}

function PageHeading({ eyebrow, title, description, action, tag }) {
  return (
    <div className="page-title-row">
      <div><div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
      <div className="page-heading-actions">{tag && <span className="heading-tag">{tag}</span>}{action}</div>
    </div>
  );
}

function Metric({ label, value, note, icon: Icon, tone, trend }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={17}/></div></div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{trend && <span className="metric-trend"><TrendingUp size={12}/></span>}{note}</div>
      <div className={`metric-accent ${tone}`}/>
    </article>
  );
}

function Overview({ inventory, machines, alerts, acknowledge, setActive, selectedProcess, setSelectedProcess }) {
  const lowStock = inventory.filter(x => Number(x.quantity) <= Number(x.minimum)).length;
  const running = machines.filter(x => x.status === "Running").length;
  const riskMachines = machines.filter(x => x.status === "At risk" || x.status === "Maintenance").length;
  const current = processes.find(p => p.id === selectedProcess) || processes[0];

  return (
    <>
      <PageHeading
        eyebrow="FACILITY OPERATIONS / SHIFT MONITOR"
        title="Plant command centre"
        description="Production health, asset readiness and operational risk in one place."
        tag="SHIFT A · DEMO DATA"
        action={<button className="button-secondary" onClick={() => window.print()}><Download size={15}/> Export report</button>}
      />

      <section className="command-hero">
        <div className="command-hero-grid"/>
        <div className="command-hero-copy">
          <div className="hero-overline"><span className="status-dot"/> FACILITY PULSE <span className="hero-divider"/> PLANT 01</div>
          <h2>Production is <em>holding steady.</em></h2>
          <p>One operational constraint needs attention. Review the assembly line before it affects downstream throughput.</p>
          <div className="hero-actions"><button className="button-primary" onClick={() => setActive("Process intelligence")}>Investigate constraint <ArrowUpRight size={15}/></button><span><ShieldCheck size={14}/> Monitoring workspace active</span></div>
        </div>
        <div className="hero-score">
          <div className="score-ring"><div className="score-ring-inner"><strong>92.4<span>%</span></strong><small>OEE INDEX</small></div></div>
          <div className="score-caption"><span className="score-up"><TrendingUp size={13}/> +3.2%</span><span>vs previous shift</span></div>
        </div>
        <div className="hero-index">01 <span>/</span> 04</div>
      </section>

      <div className="section-line-heading"><div><span className="section-kicker">OPERATIONAL SNAPSHOT</span><h2>Facility metrics</h2></div><span className="section-meta">LAST SHIFT · ILLUSTRATIVE</span></div>
      <div className="metric-grid">
        <Metric label="Operational efficiency" value="92.4%" note="3.2% vs previous shift" icon={Activity} tone="red" trend/>
        <Metric label="Production throughput" value="1,284" note="Units produced this shift" icon={Package} tone="violet"/>
        <Metric label="Machines running" value={`${running} / ${machines.length}`} note={`${riskMachines} need attention`} icon={Cpu} tone="amber"/>
        <Metric label="Low-stock materials" value={String(lowStock).padStart(2, "0")} note="Below configured minimum" icon={Boxes} tone="blue"/>
      </div>

      <div className="overview-grid">
        <section className="panel constraint-panel">
          <div className="panel-topline"><span className="section-kicker">01 / ACTIVE CONSTRAINT</span><span className="severity-pill"><i/> HIGH ATTENTION</span></div>
          <div className="constraint-main"><div className="constraint-symbol"><AlertTriangle size={19}/></div><div><h2>Assembly cycle time rising</h2><p>Illustrative demo signal · Assembly cell M-04</p></div></div>
          <div className="constraint-metrics">
            <div><strong>18.2 <small>min</small></strong><span>Current cycle time</span></div>
            <div><strong>+24%</strong><span>Above baseline</span></div>
            <div><strong>03</strong><span>Downstream stages</span></div>
          </div>
          <div className="constraint-footer"><span><GitBranch size={15}/> Assembly <b>→</b> Inspection <b>→</b> Dispatch</span><button onClick={() => { setSelectedProcess("P04"); setActive("Process intelligence"); }}>Trace dependency <ArrowUpRight size={14}/></button></div>
        </section>

        <section className="panel readiness-panel">
          <div className="panel-heading"><div><span className="section-kicker">02 / RESOURCE READINESS</span><h2>Shop-floor status</h2></div><Gauge size={18}/></div>
          <div className="readiness-primary"><strong>{machines.length ? Math.round(running / machines.length * 100) : 0}<small>%</small></strong><span>machines operational</span></div>
          <div className="readiness-track"><span style={{ width: `${machines.length ? running / machines.length * 100 : 0}%` }}/></div>
          <div className="readiness-detail"><span>Registered machines</span><b>{machines.length}</b></div>
          <div className="readiness-detail"><span>Materials tracked</span><b>{inventory.length}</b></div>
          <div className="readiness-detail"><span>Below minimum stock</span><b className={lowStock ? "text-red" : ""}>{lowStock}</b></div>
          <button className="panel-inline-link" onClick={() => setActive("Inventory")}>Open material register <ArrowUpRight size={14}/></button>
        </section>
      </div>

      <section className="panel flow-panel">
        <div className="panel-heading"><div><span className="section-kicker">03 / PRODUCTION FLOW</span><h2>Process line monitor</h2><p>Select a stage to inspect its cycle time and downstream dependencies.</p></div><button className="text-button" onClick={() => setActive("Process intelligence")}>Full process map <ArrowUpRight size={14}/></button></div>
        <div className="process-flow">
          {processes.map((p, i) => (
            <button type="button" key={p.id} className={`flow-stage ${p.status === "At risk" ? "stage-risk" : ""} ${selectedProcess === p.id ? "stage-selected" : ""}`} onClick={() => setSelectedProcess(p.id)} aria-pressed={selectedProcess === p.id}>
              <div className="stage-top"><span>{String(i + 1).padStart(2, "0")}</span><i/></div>
              <b>{p.name}</b><small>{p.machine}</small>
              <div className="stage-bar"><span style={{ width: `${p.completion}%` }}/></div>
              <div className="stage-bottom"><span>{p.completion}% complete</span><em>{p.time}</em></div>
            </button>
          ))}
        </div>
        <div className="selected-process-detail"><div className="selected-process-identity"><span className="section-kicker">SELECTED STAGE · {current.id}</span><b>{current.name}</b><small>{current.machine}</small></div><div className="selected-process-stat"><strong>{current.completion}%</strong><span>Completion</span></div><div className="selected-process-stat"><strong>{current.time}</strong><span>Cycle time</span></div><span className={`process-state ${current.status === "At risk" ? "risk" : "good"}`}>{current.status}</span><button className="text-button" onClick={() => setActive("Process intelligence")}>Inspect <ArrowUpRight size={14}/></button></div>
      </section>

      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><span className="section-kicker">04 / OUTPUT PERFORMANCE</span><h2>Production trend</h2><p>Actual output against planned target</p></div><span className="chart-period">SHIFT VIEW <i/></span></div>
          <div className="chart-summary"><div><strong>1,284</strong><span>units produced</span></div><em><TrendingUp size={13}/> 8.6%</em></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={productionTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="indunexOutput" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef3348" stopOpacity={0.28}/><stop offset="100%" stopColor="#ef3348" stopOpacity={0.015}/></linearGradient></defs><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--chart-label)" }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 10, fill: "var(--chart-label)" }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--text)" }}/><Area type="monotone" dataKey="actual" name="Actual output" stroke="#ef3348" strokeWidth={2.4} fill="url(#indunexOutput)"/><Area type="monotone" dataKey="target" name="Planned target" stroke="#858b96" strokeDasharray="5 5" fill="none"/></AreaChart></ResponsiveContainer></div>
        </section>
        <section className="panel alerts-panel">
          <div className="panel-heading"><div><span className="section-kicker">05 / ATTENTION QUEUE</span><h2>Priority signals</h2><p>Exceptions requiring review</p></div><span className="alert-count">{alerts.filter(a => !a.acknowledged).length} OPEN</span></div>
          <div className="alert-list">{alerts.slice(0, 4).map(a => <div className={`alert-row ${a.acknowledged ? "acknowledged" : ""}`} key={a.id}><div className={`alert-symbol ${a.level}`}>{a.level === "critical" ? <AlertTriangle size={16}/> : a.level === "warning" ? <Activity size={16}/> : <ShieldCheck size={16}/>}</div><div className="alert-copy"><b>{a.title}</b><p>{a.detail}</p><small>{a.time}</small></div>{!a.acknowledged && <button className="ack-button" onClick={() => acknowledge(a.id)} title="Acknowledge"><Check size={15}/></button>}</div>)}</div>
        </section>
      </div>

      <section className="model-launch-section">
        <div className="panel-heading"><div><span className="section-kicker">06 / MODEL WORKBENCH</span><h2>Prepare an ML analysis</h2><p>Enter operating conditions and production-line metrics for your team's models.</p></div><button className="text-button" onClick={() => setActive("Predictive insights")}>Open workbench <ArrowUpRight size={14}/></button></div>
        <div className="model-launch-grid">
          <button className="model-launch-card" onClick={() => setActive("Predictive insights")}><span className="model-launch-icon"><Thermometer size={19}/></span><span className="model-launch-copy"><small>MODEL 01 · MACHINE CONDITION</small><b>Machine failure inputs</b><em>6 operating parameters</em></span><ArrowUpRight size={17}/></button>
          <button className="model-launch-card" onClick={() => setActive("Predictive insights")}><span className="model-launch-icon"><Factory size={19}/></span><span className="model-launch-copy"><small>MODEL 02 · PRODUCTION LINE</small><b>Line performance inputs</b><em>17 production parameters</em></span><ArrowUpRight size={17}/></button>
        </div>
      </section>

      <div className="demo-disclaimer"><ShieldCheck size={15}/><span><b>Demo environment.</b> Production metrics and model inputs are illustrative until connected to live factory and ML services. Inventory and machine records are stored in this browser.</span></div>
    </>
  );
}

function ProcessIntelligence({ selectedProcess, setSelectedProcess }) {
  const current = processes.find(p => p.id === selectedProcess) || processes[0];
  const index = processes.findIndex(p => p.id === current.id);
  const upstream = processes.slice(0, index);
  const downstream = processes.slice(index + 1);
  const isRisk = current.status === "At risk";

  return (
    <>
      <PageHeading eyebrow="OPERATIONS / PROCESS INTELLIGENCE" title="Process intelligence" description="Inspect stage performance, trace line dependencies and understand where production risk can propagate." tag="6 STAGES"/>
      <div className="process-overview-strip"><div><span>MONITORED STAGES</span><strong>06</strong></div><div><span>SELECTED STAGE</span><strong>{current.id}</strong></div><div><span>CYCLE TIME</span><strong>{current.time}</strong></div><div><span>DOWNSTREAM STAGES</span><strong>{String(downstream.length).padStart(2, "0")}</strong></div></div>
      <div className="process-intelligence-grid">
        <section className="panel process-selector-panel"><div className="panel-heading"><div><span className="section-kicker">PRODUCTION SEQUENCE</span><h2>Stage navigator</h2><p>Select any stage to inspect it.</p></div></div><div className="process-selector-list">{processes.map((p, i) => <button key={p.id} className={`process-selector-item ${p.id === current.id ? "selected" : ""} ${p.status === "At risk" ? "risk" : ""}`} onClick={() => setSelectedProcess(p.id)}><div className="process-selector-top"><span>STAGE 0{i + 1}</span><span className={`process-status ${p.status === "At risk" ? "risk" : ""}`}>{p.status.toUpperCase()}</span></div><b>{p.name}</b><small>{p.machine}</small><div className="process-progress"><span style={{ width: `${p.completion}%` }}/></div><div className="process-selector-bottom"><span>{p.completion}% complete</span><span>{p.time}</span></div></button>)}</div></section>
        <div className="process-detail-column">
          <section className="panel selected-stage-panel"><div className="selected-stage-header"><div><span className="section-kicker">SELECTED PROCESS / {current.id}</span><h2>{current.name}</h2><p>{current.machine}</p></div><span className={`process-state ${isRisk ? "risk" : "good"}`}>{current.status}</span></div><div className="stage-metrics"><div><span>CYCLE TIME</span><strong>{current.time}</strong></div><div><span>COMPLETION</span><strong>{current.completion}%</strong></div><div><span>STAGE IDENTIFIER</span><strong>{current.id}</strong></div></div><div className="stage-completion-block"><div><span>Stage completion</span><b>{current.completion}%</b></div><div className="stage-completion-track"><span style={{ width: `${current.completion}%` }}/></div></div></section>
          <section className="panel dependency-panel"><span className="section-kicker">DEPENDENCY ANALYSIS</span><h2>Production flow impact</h2><p className="panel-subtitle">Select another node to move through the sequence.</p><div className="dependency-flow">{upstream.map(p => <button key={p.id} className="dependency-node" onClick={() => setSelectedProcess(p.id)}><span>{p.id}</span><b>{p.name}</b><small>UPSTREAM</small></button>)}<div className={`dependency-node current ${isRisk ? "risk" : ""}`}><span>{current.id}</span><b>{current.name}</b><small>SELECTED STAGE</small></div>{downstream.map(p => <button key={p.id} className="dependency-node" onClick={() => setSelectedProcess(p.id)}><span>{p.id}</span><b>{p.name}</b><small>DOWNSTREAM</small></button>)}</div><p className="dependency-note">This is a sequential demo dependency view. Actual queue propagation requires connected production data.</p></section>
          <section className={`panel response-panel ${isRisk ? "response-risk" : ""}`}><span className="section-kicker">OPERATIONAL RESPONSE</span><h2>{isRisk ? "Investigate the production constraint" : "Maintain current operating conditions"}</h2><p>{isRisk ? "Review machine utilisation, cycle-time trends and material availability. Check whether this queue could delay downstream inspection and dispatch before changing the production schedule." : "Continue monitoring this stage and compare its cycle time and completion against the next production interval."}</p><small>RULE-BASED DEMO GUIDANCE · NOT A LIVE AI PREDICTION</small></section>
        </div>
      </div>
    </>
  );
}

function ModelWorkbench() {
  const [model, setModel] = useState("model1");
  const [valuesOne, setValuesOne] = useState(initialModelOne);
  const [valuesTwo, setValuesTwo] = useState(initialModelTwo);
  const [preview, setPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const fields = model === "model1" ? modelOneFields : modelTwoFields;
  const values = model === "model1" ? valuesOne : valuesTwo;
  const setValues = model === "model1" ? setValuesOne : setValuesTwo;

  const changeValue = (key, value) => {
    setValues(previous => ({ ...previous, [key]: value }));
    setPreview(null);
    setCopied(false);
  };

  const reset = () => {
    setValues(model === "model1" ? { ...initialModelOne } : { ...initialModelTwo });
    setPreview(null);
    setCopied(false);
  };

  const submit = event => {
    event.preventDefault();
    const payload = Object.fromEntries(fields.map(field => [
      field.key,
      field.type === "number" ? Number(values[field.key]) : values[field.key].trim()
    ]));
    setPreview({ model: model === "model1" ? "model_1" : "model_2", inputs: payload });
  };

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeading eyebrow="INTELLIGENCE / MODEL INPUT WORKBENCH" title="Predictive insights" description="Configure model inputs using machine-condition and production-line operating data." tag="ML INTEGRATION READY"/>
      <section className="workbench-banner"><div className="workbench-banner-icon"><Sparkles size={22}/></div><div><span className="section-kicker">MODEL INPUT STUDIO</span><h2>Turn operating data into a model-ready request.</h2><p>Choose a model, enter the required parameters and preview the JSON payload for your ML service.</p></div><div className="workbench-banner-mark">ML<span>/</span>01</div></section>

      <div className="model-tabs" role="tablist" aria-label="Select model">
        <button role="tab" aria-selected={model === "model1"} className={model === "model1" ? "active" : ""} onClick={() => { setModel("model1"); setPreview(null); }}><span className="model-tab-index">01</span><span><b>Machine condition</b><small>Failure / wear indicators · 6 inputs</small></span><ChevronRight size={17}/></button>
        <button role="tab" aria-selected={model === "model2"} className={model === "model2" ? "active" : ""} onClick={() => { setModel("model2"); setPreview(null); }}><span className="model-tab-index">02</span><span><b>Production line performance</b><small>Cycle time, WIP, assets and operators · 17 inputs</small></span><ChevronRight size={17}/></button>
      </div>

      <div className="workbench-layout">
        <form className="panel model-form-panel" onSubmit={submit}>
          <div className="model-form-heading"><div><span className="section-kicker">{model === "model1" ? "MODEL 01 / MACHINE CONDITION" : "MODEL 02 / PRODUCTION LINE"}</span><h2>{model === "model1" ? "Machine operating parameters" : "Production and line parameters"}</h2><p>{model === "model1" ? "Enter the operating conditions for the selected machine." : "Enter the line-level operating, equipment and workforce metrics."}</p></div><span className="input-count">{fields.length} INPUTS</span></div>

          {model === "model1" ? (
            <div className="model-fields-grid">
              {fields.map((field, index) => <label className={`model-field ${field.key === "Type" ? "field-wide" : ""}`} key={field.key}><span className="model-field-index">{String(index + 1).padStart(2, "0")}</span><span className="model-field-label">{field.label}{field.unit && <em>{field.unit}</em>}</span><div className="model-input-wrap"><input required type={field.type} min={field.type === "number" ? "0" : undefined} step="any" value={values[field.key]} onChange={e => changeValue(field.key, e.target.value)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}/>{field.unit && <span className="input-unit">{field.unit}</span>}</div>{field.hint && <small className="field-hint">{field.hint}</small>}</label>)}
            </div>
          ) : (
            <>
              <div className="form-section-label"><span>01</span> CYCLE TIME & FLOW</div>
              <div className="model-fields-grid">
                {fields.slice(0, 10).map((field, index) => <label className="model-field" key={field.key}><span className="model-field-index">{String(index + 1).padStart(2, "0")}</span><span className="model-field-label">{field.label}{field.unit && <em>{field.unit}</em>}</span><div className="model-input-wrap"><input required type="number" min="0" step={field.step || "any"} value={values[field.key]} onChange={e => changeValue(field.key, e.target.value)} placeholder="Enter value"/>{field.unit && <span className="input-unit">{field.unit}</span>}</div></label>)}
              </div>
              <div className="form-section-label"><span>02</span> EQUIPMENT & WORKFORCE</div>
              <div className="model-fields-grid">
                {fields.slice(10).map((field, index) => <label className="model-field" key={field.key}><span className="model-field-index">{String(index + 11).padStart(2, "0")}</span><span className="model-field-label">{field.label}{field.unit && <em>{field.unit}</em>}</span><div className="model-input-wrap"><input required type={field.type} min={field.type === "number" ? "0" : undefined} step={field.step || (field.type === "number" ? "any" : undefined)} value={values[field.key]} onChange={e => changeValue(field.key, e.target.value)} placeholder={field.placeholder || (field.type === "number" ? "Enter value" : "Enter model category")}/></div>{field.type === "text" && <small className="field-hint">Use the exact category or encoding expected by the trained model.</small>}</label>)}
              </div>
            </>
          )}

          <div className="model-form-footer"><div className="form-note"><ShieldCheck size={15}/><span>Inputs are validated in this browser. No data is sent to a server yet.</span></div><div className="form-actions"><button type="button" className="button-secondary" onClick={reset}><RotateCcw size={14}/> Reset</button><button type="submit" className="button-primary"><Zap size={15}/> Validate & preview</button></div></div>
        </form>

        <aside className="model-aside">
          <section className="panel model-aside-card"><span className="section-kicker">REQUEST STATUS</span><div className="api-status"><span className="status-dot status-pending"/> AWAITING API CONNECTION</div><p>Once your teammate provides the prediction endpoint and request schema, this form can send the payload to the model.</p><div className="api-status-line"><span>Input source</span><b>Manual entry</b></div><div className="api-status-line"><span>Payload format</span><b>JSON</b></div><div className="api-status-line"><span>Model endpoint</span><b className="text-amber">Not connected</b></div></section>
          <section className="panel model-aside-card"><span className="section-kicker">INTEGRATION CHECKLIST</span><div className="integration-step"><i>01</i><span><b>Input schema</b><small>Fields added from the ML specification</small></span><Check size={15}/></div><div className="integration-step"><i>02</i><span><b>Category encoding</b><small>Confirm accepted values for text fields</small></span><CircleDot size={15}/></div><div className="integration-step"><i>03</i><span><b>Prediction endpoint</b><small>Connect the model API route</small></span><CircleDot size={15}/></div><div className="integration-step"><i>04</i><span><b>Prediction response</b><small>Map output labels and confidence scores</small></span><CircleDot size={15}/></div></section>
        </aside>
      </div>

      {preview && <section className="panel payload-panel"><div className="payload-heading"><div><span className="section-kicker">PAYLOAD PREVIEW</span><h2>Validated model request</h2><p>Local validation only. This payload has not been submitted to an ML endpoint.</p></div><button className="button-secondary" onClick={copyPayload}><Copy size={14}/>{copied ? "Copied" : "Copy JSON"}</button></div><pre>{JSON.stringify(preview, null, 2)}</pre></section>}
      <div className="demo-disclaimer"><ShieldCheck size={15}/><span>Model inputs are based on the parameter list supplied by your ML teammate. Predictions remain unavailable until the API and model output schema are connected.</span></div>
    </>
  );
}

function InventoryPage({ inventory, setInventory, factory }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyInventory);
  const [extra, setExtra] = useState({});
  const current = inventory.filter(x => x.factoryId === factory);
  const filtered = current.filter(x => `${x.name} ${x.category} ${x.supplier || ""}`.toLowerCase().includes(search.toLowerCase()));
  const low = current.filter(x => Number(x.quantity) <= Number(x.minimum)).length;
  const industry = factories.find(f => f.id === factory)?.industry;
  const fields = industryFields[industry] || [];

  const openForm = item => { setEditing(item || null); setForm(item ? { ...emptyInventory, ...item } : { ...emptyInventory }); setExtra(item?.industryData || {}); setShowForm(true); };
  const save = event => {
    event.preventDefault();
    const record = { ...form, ...extra, industryData: extra, factoryId: factory, id: editing?.id || `inv-${Date.now()}`, updatedAt: new Date().toISOString() };
    setInventory(editing ? inventory.map(x => x.id === editing.id ? record : x) : [record, ...inventory]);
    setShowForm(false);
  };
  const remove = id => { if (window.confirm("Delete this inventory record?")) setInventory(inventory.filter(x => x.id !== id)); };

  return (
    <>
      <PageHeading eyebrow="OPERATIONS / MATERIAL CONTROL" title="Inventory & resources" description="Maintain material records, stock thresholds and industry-specific storage requirements." action={<button className="button-primary" onClick={() => openForm()}><Plus size={15}/> Add material</button>}/>
      <div className="inventory-summary"><div><span>Tracked materials</span><strong>{current.length}</strong></div><div><span>Below minimum stock</span><strong className={low ? "text-red" : ""}>{low}</strong></div><div><span>Industry profile</span><strong>{industry}</strong></div><div><span>Facility</span><strong>{factories.find(f => f.id === factory)?.name.split("·").pop().trim()}</strong></div></div>
      <section className="panel data-panel"><div className="table-toolbar"><div><span className="section-kicker">MATERIAL REGISTER</span><h2>Stock records</h2><p>Changes are saved locally in this browser.</p></div><label className="search-field"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."/></label></div>
        <div className="table-scroll"><table><thead><tr><th>ITEM / MATERIAL</th><th>CATEGORY</th><th>AVAILABLE</th><th>MINIMUM</th><th>STORAGE</th><th>STATUS</th><th/></tr></thead><tbody>{filtered.map(item => { const isLow = Number(item.quantity) <= Number(item.minimum); return <tr key={item.id}><td><b>{item.name}</b><small>{item.partNumber || item.componentCode || item.batchNumber || item.industryData?.partNumber || "No reference ID"}</small></td><td>{item.category}</td><td><strong>{item.quantity || "—"} {item.unit}</strong></td><td>{item.minimum || "—"} {item.unit}</td><td>{item.storage || "Standard"}{item.temperature ? <small>{item.temperature}°C</small> : null}</td><td><span className={`table-status ${isLow ? "status-low" : "status-good"}`}>{isLow ? "Reorder needed" : "In stock"}</span></td><td><div className="row-actions"><button onClick={() => openForm(item)} title="Edit"><Pencil size={14}/></button><button onClick={() => remove(item.id)} title="Delete"><Trash2 size={14}/></button></div></td></tr>; })}</tbody></table>
          {!filtered.length && <div className="empty-state"><Warehouse size={27}/><b>{search ? "No matching materials" : "No inventory records yet"}</b><p>{search ? "Try another search term." : "Add materials to start tracking stock and storage conditions."}</p>{!search && <button className="button-primary" onClick={() => openForm()}><Plus size={14}/> Add first material</button>}</div>}
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowForm(false)}><form className="edit-modal" onSubmit={save}><div className="modal-heading"><div><span className="section-kicker">MATERIAL REGISTER / {industry}</span><h2>{editing ? "Edit material" : "Add material"}</h2><p>Material details and storage requirements</p></div><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18}/></button></div><div className="form-grid"><label className="full-field">Item / material name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Titanium alloy sheet"/></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{["Raw material", "Component", "Consumable", "Packaging", "Work in progress", "Finished goods", "Chemical"].map(v => <option key={v}>{v}</option>)}</select></label><label>Linked process<select value={form.process} onChange={e => setForm({ ...form, process: e.target.value })}><option value="">Unassigned</option>{processes.map(p => <option key={p.id}>{p.name}</option>)}</select></label><label>Available quantity<input required type="number" min="0" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}/></label><label>Minimum stock level<input type="number" min="0" step="any" value={form.minimum} onChange={e => setForm({ ...form, minimum: e.target.value })}/></label><label>Unit<select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{["kg", "g", "litres", "units", "pieces", "metres", "rolls", "boxes", "tonnes"].map(v => <option key={v}>{v}</option>)}</select></label><label>Storage condition<input value={form.storage} onChange={e => setForm({ ...form, storage: e.target.value })} placeholder="e.g. Dry, ESD-safe"/></label><label>Storage temperature (°C)<input type="number" step="any" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })}/></label><label>Storage humidity (%)<input type="number" min="0" max="100" step="any" value={form.humidity} onChange={e => setForm({ ...form, humidity: e.target.value })}/></label><label>Expiry / review date<input type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })}/></label>{fields.map(([key, label]) => <label key={key}>{label}<input value={extra[key] || ""} onChange={e => setExtra({ ...extra, [key]: e.target.value })}/></label>)}<label className="full-field">Notes<textarea rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional handling or procurement notes"/></label></div><div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button-primary" type="submit"><Check size={14}/> Save material</button></div></form></div>}
    </>
  );
}

function MachinesPage({ machines, setMachines, factory }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMachine);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const current = machines.filter(x => x.factoryId === factory);
  const filtered = current.filter(m => `${m.name} ${m.type} ${m.assetTag} ${m.process}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === "All" || m.status === statusFilter));
  const openForm = item => { setEditing(item || null); setForm(item ? { ...emptyMachine, ...item } : { ...emptyMachine }); setShowForm(true); };
  const save = event => {
    event.preventDefault();
    const record = { ...form, capacity: form.capacity === "" ? "" : Number(form.capacity), utilisation: form.utilisation === "" ? "" : Number(form.utilisation), temperature: form.temperature === "" ? "" : Number(form.temperature), maxTemperature: form.maxTemperature === "" ? "" : Number(form.maxTemperature), maintenanceDays: form.maintenanceDays === "" ? "" : Number(form.maintenanceDays), factoryId: factory, id: editing?.id || `machine-${Date.now()}` };
    setMachines(editing ? machines.map(x => x.id === editing.id ? record : x) : [record, ...machines]);
    setShowForm(false);
  };
  const remove = id => { if (window.confirm("Remove this machine record?")) setMachines(machines.filter(x => x.id !== id)); };

  return (
    <>
      <PageHeading eyebrow="OPERATIONS / ASSET REGISTER" title="Machines & equipment" description="Register production assets, define operating limits and map equipment to process stages." action={<button className="button-primary" onClick={() => openForm()}><Plus size={15}/> Register machine</button>}/>
      <div className="inventory-summary"><div><span>Total registered</span><strong>{current.length}</strong></div><div><span>Running</span><strong>{current.filter(x => x.status === "Running").length}</strong></div><div><span>Needs attention</span><strong className="text-red">{current.filter(x => ["At risk", "Maintenance"].includes(x.status)).length}</strong></div><div><span>Offline / idle</span><strong>{current.filter(x => ["Offline", "Idle"].includes(x.status)).length}</strong></div></div>
      <section className="panel data-panel"><div className="table-toolbar"><div><span className="section-kicker">ASSET REGISTER</span><h2>Equipment records</h2><p>Manage assets assigned to this facility.</p></div><div className="machine-filters"><label className="search-field"><Search size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment..."/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter machine status">{["All", "Running", "Idle", "At risk", "Maintenance", "Offline"].map(v => <option key={v}>{v}</option>)}</select></div></div>
        <div className="machine-grid">{filtered.map(machine => <article className="machine-card" key={machine.id}><div className="machine-card-top"><div className="machine-avatar"><Cpu size={19}/></div><span className={`machine-state ${machine.status.toLowerCase().replace(" ", "-")}`}>{machine.status}</span></div><h3>{machine.name}</h3><p>{machine.type || "Machine type not specified"}</p><div className="machine-meta"><span>ASSET TAG</span><b>{machine.assetTag || "Not assigned"}</b></div><div className="machine-meta"><span>PROCESS</span><b>{machine.process || "Unassigned"}</b></div><div className="machine-readings"><div><strong>{machine.utilisation || "—"}<small>%</small></strong><span>Utilisation</span></div><div><strong>{machine.temperature || "—"}<small>°C</small></strong><span>Temperature</span></div><div><strong>{machine.capacity || "—"}</strong><span>Units / hr</span></div></div><div className="machine-card-actions"><button onClick={() => openForm(machine)}><Pencil size={13}/> Edit details</button><button onClick={() => remove(machine.id)} title="Delete machine"><Trash2 size={14}/></button></div></article>)}
          {!filtered.length && <div className="empty-state"><Cpu size={27}/><b>{search || statusFilter !== "All" ? "No matching machines" : "No machines registered"}</b><p>{search || statusFilter !== "All" ? "Change the search or status filter." : "Register equipment to start tracking facility assets."}</p>{!search && statusFilter === "All" && <button className="button-primary" onClick={() => openForm()}><Plus size={14}/> Register first machine</button>}</div>}
        </div>
      </section>
      {showForm && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowForm(false)}><form className="edit-modal" onSubmit={save}><div className="modal-heading"><div><span className="section-kicker">ASSET REGISTER</span><h2>{editing ? "Edit machine" : "Register machine"}</h2><p>Equipment specifications and operating parameters</p></div><button type="button" className="modal-close" onClick={() => setShowForm(false)}><X size={18}/></button></div><div className="form-grid"><label className="full-field">Machine name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 5-axis CNC machine"/></label><label>Machine type<input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}/></label><label>Asset tag / ID<input value={form.assetTag} onChange={e => setForm({ ...form, assetTag: e.target.value })}/></label><label>Manufacturer<input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })}/></label><label>Assigned process<select value={form.process} onChange={e => setForm({ ...form, process: e.target.value })}><option value="">Unassigned</option>{processes.map(p => <option key={p.id}>{p.name}</option>)}</select></label><label>Operating status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{["Running", "Idle", "At risk", "Maintenance", "Offline"].map(v => <option key={v}>{v}</option>)}</select></label><label>Capacity (units / hour)<input type="number" min="0" step="any" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}/></label><label>Current utilisation (%)<input type="number" min="0" max="100" value={form.utilisation} onChange={e => setForm({ ...form, utilisation: e.target.value })}/></label><label>Current temperature (°C)<input type="number" step="any" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })}/></label><label>Maximum operating temperature (°C)<input type="number" step="any" value={form.maxTemperature} onChange={e => setForm({ ...form, maxTemperature: e.target.value })}/></label><label>Maintenance interval (days)<input type="number" min="0" value={form.maintenanceDays} onChange={e => setForm({ ...form, maintenanceDays: e.target.value })}/></label></div><div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button-primary" type="submit"><Check size={14}/> Save machine</button></div></form></div>}
    </>
  );
}

function PlaceholderPage({ title, description, setActive }) {
  return <><PageHeading eyebrow="WORKSPACE / MODULE" title={title} description={description}/><section className="panel placeholder-panel"><div className="placeholder-icon"><Sparkles size={23}/></div><span className="section-kicker">MODULE STANDBY</span><h2>Ready for backend integration</h2><p>This module is kept separate from local machine and inventory management. Connect the relevant API and workflow to activate it.</p><button className="button-secondary" onClick={() => setActive("Overview")}>Return to command centre <ArrowUpRight size={14}/></button></section></>;
}

export default function App() {
  const [active, setActive] = useState("Overview");
  const [selectedProcess, setSelectedProcess] = useState("P04");
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem("indunex-theme"); return saved === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const [factory, setFactory] = useState(factories[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventory, setInventory] = useLocalData(STORE.inventory, []);
  const [machines, setMachines] = useLocalData(STORE.machines, seedMachines);
  const [alerts, setAlerts] = useLocalData(STORE.alerts, initialAlerts.map(a => ({ ...a, acknowledged: false })));

  const changeTheme = next => { setTheme(next); try { localStorage.setItem("indunex-theme", next); } catch (error) { console.error(error); } };
  const acknowledge = id => setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  const placeholders = {
    "What-if simulator": ["What-if simulator", "Explore production scenarios and evaluate possible changes to capacity, staffing and machine availability."],
    "Interventions": ["Interventions", "Review and approve operational actions after connecting the intervention service."],
    "Factory settings": ["Factory settings", "Configure facility metadata, operating thresholds and workspace preferences."]
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <Sidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen}/>
      {sidebarOpen && <button className="mobile-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"/>}
      <main className="main-area">
        <Header factory={factory} setFactory={setFactory} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={changeTheme} active={active}/>
        <div className="page-content">
          {active === "Overview" && <Overview inventory={inventory} machines={machines.filter(m => m.factoryId === factory)} alerts={alerts} acknowledge={acknowledge} setActive={setActive} selectedProcess={selectedProcess} setSelectedProcess={setSelectedProcess}/>}
          {active === "Process intelligence" && <ProcessIntelligence selectedProcess={selectedProcess} setSelectedProcess={setSelectedProcess}/>}
          {["Predictive insights", "Model Inputs"].includes(active) && <ModelWorkbench/>}
          {active === "Inventory" && <InventoryPage inventory={inventory} setInventory={setInventory} factory={factory}/>}
          {active === "Machines" && <MachinesPage machines={machines} setMachines={setMachines} factory={factory}/>}
          {placeholders[active] && <PlaceholderPage title={placeholders[active][0]} description={placeholders[active][1]} setActive={setActive}/>}
          <footer className="app-footer"><span>© 2026 INDUNEX <i/> INDUSTRIAL INTELLIGENCE</span><span><b className="status-dot"/> LOCAL WORKSPACE · BROWSER STORAGE</span></footer>
        </div>
      </main>
    </div>
  );
}
