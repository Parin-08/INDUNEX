import React, { useMemo, useState } from "react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Boxes,
  Building2, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Cpu, Factory,
  Gauge, GitBranch, LayoutDashboard, Menu, Package, Search, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, Wrench, X, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, Cell
} from "recharts";
import { factories, kpis, processes, productionTrend, machineLoad, alerts as initialAlerts } from "./data";

const iconMap = { activity: Activity, package: Package, cpu: Cpu, alert: AlertTriangle };
const navGroups = [
  { label: "WORKSPACE", items: [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Process intelligence", icon: GitBranch },
    { name: "Predictive insights", icon: Sparkles, badge: "2" }
  ]},
  { label: "OPERATIONS", items: [
    { name: "Machines & telemetry", icon: Gauge },
    { name: "Inventory & resources", icon: Boxes },
    { name: "What-if simulator", icon: SlidersHorizontal }
  ]},
  { label: "MANAGE", items: [
    { name: "Interventions", icon: Wrench },
    { name: "Factory settings", icon: Settings2 }
  ]}
];

function Sidebar({ active, setActive, open, setOpen }) {
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="brand"><div className="brand-mark"><span/><span/><span/></div><div><b>INDUNEX</b><small>INDUSTRIAL INTELLIGENCE</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18}/></button></div>
    <div className="workspace-label">WORKSPACE</div>
    <button className="workspace-switch"><div className="workspace-icon"><Factory size={17}/></div><span><b>Operations hub</b><small>Demo environment</small></span><ChevronDown size={15}/></button>
    <nav>{navGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item => {
      const Icon = item.icon; return <button key={item.name} className={`nav-item ${active === item.name ? "active" : ""}`} onClick={() => {setActive(item.name); setOpen(false);}}>
        <Icon size={17}/><span>{item.name}</span>{item.badge && <em>{item.badge}</em>}
      </button>;
    })}</div>)}</nav>
    <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Explore the INDUNEX workspace guide.</p><button onClick={() => setActive("Help & documentation")}>Open guide <ArrowUpRight size={13}/></button></div><div className="profile"><div className="avatar">PA</div><div><b>Project Admin</b><small>Demo account</small></div><ChevronDown size={15}/></div></div>
  </aside>;
}

function Header({ factory, setFactory, timeRange, setTimeRange, setSidebarOpen }) {
  return <header className="topbar">
    <div className="top-left"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button><div className="breadcrumbs">Workspace <ChevronRight size={14}/> <b>Overview</b></div></div>
    <div className="top-actions">
      <div className="demo-pill"><span/> DEMO DATA</div>
      <label className="factory-select"><Building2 size={16}/><select value={factory} onChange={e => setFactory(e.target.value)}>{factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><ChevronDown size={14}/></label>
      <div className="top-divider"/>
      <button className="icon-button search-button" aria-label="Search"><Search size={18}/></button>
      <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button>
      <div className="top-avatar">PA</div>
    </div>
  </header>;
}

function MetricCard({ item }) {
  const Icon = iconMap[item.icon] || Activity;
  const isPositive = item.change.startsWith("+");
  return <article className="metric-card"><div className="metric-top"><span>{item.label}</span><div className={`metric-icon ${item.tone}`}><Icon size={18}/></div></div><div className="metric-value">{item.value} {item.suffix && <small>{item.suffix}</small>}</div><div className="metric-foot"><span className={`metric-change ${isPositive ? "positive" : item.tone === "orange" ? "negative" : ""}`}>{isPositive ? <ArrowUpRight size={14}/> : item.tone === "orange" ? <AlertCircle size={13}/> : <Check size={13}/>} {item.change}</span><span>{item.note}</span></div></article>;
}

function ProcessPipeline() {
  return <section className="panel pipeline-panel">
    <div className="panel-heading"><div><h2>Production pipeline</h2><p>Process health across the active production flow</p></div><button className="text-button">View process map <ArrowUpRight size={14}/></button></div>
    <div className="pipeline-list">{processes.map((p, i) => <div className="process-row" key={p.id}>
      <div className={`process-number ${p.color}`}>{String(i+1).padStart(2,"0")}</div>
      <div className="process-info"><b>{p.name}</b><small>{p.machine}</small></div>
      <div className="process-progress"><div className="progress-track"><div className={`progress-fill ${p.color}`} style={{width:`${p.completion}%`}}/></div><small>{p.completion}%</small></div>
      <div className={`status-chip ${p.status === "At risk" ? "risk" : "good"}`}><span/>{p.status}</div>
      <div className="process-time"><Clock3 size={13}/>{p.time}</div>
    </div>)}</div>
    <div className="pipeline-foot"><span><i className="legend-dot green-dot"/> On track</span><span><i className="legend-dot orange-dot"/> Needs attention</span><span className="foot-note">Cycle times are illustrative demo values</span></div>
  </section>;
}

function ProductionChart({ timeRange }) {
  const data = useMemo(() => timeRange === "24h" ? productionTrend : productionTrend.slice(-5), [timeRange]);
  return <section className="panel chart-panel">
    <div className="panel-heading"><div><h2>Production output</h2><p>Actual output against planned target</p></div><div className="chart-legend"><span><i className="legend-line actual-line"/> Actual</span><span><i className="legend-line target-line"/> Target</span></div></div>
    <div className="chart-summary"><strong>1,284</strong><span>units produced</span><em><ArrowUpRight size={14}/> 8.6%</em></div>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:8,right:8,left:-18,bottom:0}}>
      <defs><linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#287C70" stopOpacity={0.2}/><stop offset="100%" stopColor="#287C70" stopOpacity={0.01}/></linearGradient></defs>
      <CartesianGrid stroke="#edf0f3" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="time" tick={{fontSize:11,fill:"#98a1ad"}} axisLine={false} tickLine={false} dy={9}/>
      <YAxis tick={{fontSize:11,fill:"#98a1ad"}} axisLine={false} tickLine={false}/>
      <Tooltip contentStyle={{border:"1px solid #e8ebef",borderRadius:10,fontSize:12,boxShadow:"0 8px 24px #17203312"}}/>
      <Area type="monotone" dataKey="actual" stroke="#287C70" strokeWidth={2.5} fill="url(#actualFill)" activeDot={{r:5,strokeWidth:0}}/>
      <Line type="monotone" dataKey="target" stroke="#aab2bd" strokeWidth={1.8} strokeDasharray="5 5" dot={false}/>
    </AreaChart></ResponsiveContainer></div>
  </section>;
}

function MachineChart() {
  return <section className="panel machine-panel">
    <div className="panel-heading"><div><h2>Machine utilisation</h2><p>Current load by machine</p></div><button className="more-button">•••</button></div>
    <div className="machine-summary"><strong>70.2%</strong><span>Average utilisation</span><span className="machine-live"><i/> Updated just now</span></div>
    <div className="machine-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={machineLoad} margin={{top:8,right:2,left:-25,bottom:0}} barSize={19}>
      <CartesianGrid stroke="#edf0f3" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="name" tick={{fontSize:11,fill:"#98a1ad"}} axisLine={false} tickLine={false} dy={8}/>
      <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#98a1ad"}} axisLine={false} tickLine={false}/>
      <Tooltip contentStyle={{border:"1px solid #e8ebef",borderRadius:10,fontSize:12}} formatter={(v)=>[`${v}%`,"Load"]}/>
      <Bar dataKey="load" radius={[5,5,0,0]}>{machineLoad.map((m,i)=><Cell key={m.name} fill={m.state==="At risk"?"#D58A42":m.state==="Idle"?"#cbd2da":"#4D9A8B"}/>)}</Bar>
    </BarChart></ResponsiveContainer></div>
    <div className="machine-legend"><span><i className="legend-dot green-dot"/> Running</span><span><i className="legend-dot orange-dot"/> At risk</span><span><i className="legend-dot grey-dot"/> Idle</span></div>
  </section>;
}

function AlertsPanel({ alerts, acknowledge }) {
  return <section className="panel alerts-panel">
    <div className="panel-heading"><div><h2>Priority alerts <span className="count-badge">{alerts.filter(a=>!a.acknowledged).length}</span></h2><p>Signals that may affect production continuity</p></div><button className="text-button">View all <ArrowUpRight size={14}/></button></div>
    <div className="alert-list">{alerts.map(a=><div className={`alert-row ${a.acknowledged?"acknowledged":""}`} key={a.id}>
      <div className={`alert-symbol ${a.level}`}>{a.level==="critical"?<AlertTriangle size={17}/>:a.level==="warning"?<AlertCircle size={17}/>:<ShieldCheck size={17}/>}</div>
      <div className="alert-copy"><div className="alert-title-line"><b>{a.title}</b><span className={`alert-tag ${a.level}`}>{a.tag}</span></div><p>{a.detail}</p><small>{a.time}</small></div>
      {!a.acknowledged && <button className="ack-button" onClick={()=>acknowledge(a.id)}>Acknowledge</button>}
      {a.acknowledged && <span className="ack-done"><Check size={14}/> Acknowledged</span>}
    </div>)}</div>
  </section>;
}

export default function App() {
  const [active, setActive] = useState("Overview");
  const [factory, setFactory] = useState(factories[0].id);
  const [timeRange, setTimeRange] = useState("24h");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState(initialAlerts);
  const selectedFactory = factories.find(f=>f.id===factory) || factories[0];
  const acknowledge = id => setAlerts(prev=>prev.map(a=>a.id===id?{...a,acknowledged:true}:a));
  const isOverview = active === "Overview";
  return <div className="app-shell">
    <Sidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen}/>
    {sidebarOpen && <button className="mobile-overlay" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <Header factory={factory} setFactory={setFactory} timeRange={timeRange} setTimeRange={setTimeRange} setSidebarOpen={setSidebarOpen}/>
      <div className="page-content">
        <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> {selectedFactory.industry.toUpperCase()} OPERATIONS <span className="eyebrow-separator">/</span> {selectedFactory.location.toUpperCase()}</div><h1>{isOverview?"Operations overview":active}</h1><p>{isOverview?"A connected view of production health, machine performance and emerging operational risks.":"Explore your facility's operational intelligence and production signals."}</p></div><div className="page-controls"><div className="range-control"><button className={timeRange==="24h"?"selected":""} onClick={()=>setTimeRange("24h")}>24 hours</button><button className={timeRange==="5h"?"selected":""} onClick={()=>setTimeRange("5h")}>5 hours</button></div><button className="export-button" onClick={()=>window.print()}><ArrowDownRight size={15}/> Export</button></div></div>
        {isOverview ? <>
          <div className="metric-grid">{kpis.map(item=><MetricCard key={item.label} item={item}/>)}</div>
          <ProcessPipeline/>
          <div className="analytics-grid"><ProductionChart timeRange={timeRange}/><MachineChart/></div>
          <AlertsPanel alerts={alerts} acknowledge={acknowledge}/>
          <div className="bottom-note"><div className="note-icon"><Zap size={16}/></div><div><b>INDUNEX intelligence layer</b><span>Process-aware insights connect machine signals to downstream production impact.</span></div><button onClick={()=>setActive("Predictive insights")}>Explore insights <ArrowUpRight size={14}/></button></div>
        </> : <div className="placeholder-panel"><div className="placeholder-icon"><Sparkles size={24}/></div><h2>{active}</h2><p>This workspace section is scaffolded for the next implementation checkpoint. The overview dashboard is ready to demo.</p><button onClick={()=>setActive("Overview")}>Back to overview</button></div>}
        <footer><span>© 2026 INDUNEX · Industrial Intelligence Platform</span><span><i/> Demo environment · Illustrative data only</span></footer>
      </div>
    </main>
  </div>;
}
