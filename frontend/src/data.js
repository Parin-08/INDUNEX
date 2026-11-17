export const factories = [
  { id: "plant-01", name: "Aero Systems · Plant 01", industry: "Aerospace", location: "Bengaluru, IN" },
  { id: "plant-02", name: "Auto Components · Plant 02", industry: "Automotive", location: "Pune, IN" },
  { id: "plant-03", name: "Precision Electronics · Plant 03", industry: "Electronics", location: "Chennai, IN" }
];

export const kpis = [
  { label: "Operational efficiency", value: "92.4%", change: "+3.2%", note: "vs previous shift", icon: "activity", tone: "green" },
  { label: "Production throughput", value: "1,284", suffix: "units", change: "+8.6%", note: "vs previous shift", icon: "package", tone: "blue" },
  { label: "Machines running", value: "18 / 20", change: "2 idle", note: "across this facility", icon: "cpu", tone: "violet" },
  { label: "Predicted bottlenecks", value: "02", change: "1 high risk", note: "next 30 minutes", icon: "alert", tone: "orange" }
];

export const processes = [
  { id: "P01", name: "Material preparation", machine: "Prep line · M-01", completion: 96, status: "On track", time: "7.8 min", color: "mint" },
  { id: "P02", name: "Precision machining", machine: "CNC cell · M-02", completion: 83, status: "On track", time: "12.4 min", color: "blue" },
  { id: "P03", name: "Surface treatment", machine: "Finishing · M-03", completion: 91, status: "On track", time: "9.6 min", color: "violet" },
  { id: "P04", name: "Component assembly", machine: "Assembly · M-04", completion: 58, status: "At risk", time: "18.2 min", color: "orange" },
  { id: "P05", name: "Quality inspection", machine: "Inspection · M-05", completion: 95, status: "On track", time: "8.1 min", color: "mint" },
  { id: "P06", name: "Packaging & dispatch", machine: "Dispatch · M-06", completion: 88, status: "On track", time: "6.2 min", color: "blue" }
];

export const productionTrend = [
  { time: "06:00", actual: 90, target: 100 },
  { time: "07:00", actual: 104, target: 100 },
  { time: "08:00", actual: 98, target: 100 },
  { time: "09:00", actual: 112, target: 100 },
  { time: "10:00", actual: 108, target: 100 },
  { time: "11:00", actual: 96, target: 100 },
  { time: "12:00", actual: 88, target: 100 },
  { time: "13:00", actual: 94, target: 100 },
  { time: "14:00", actual: 106, target: 100 },
  { time: "15:00", actual: 115, target: 100 }
];

export const machineLoad = [
  { name: "M-01", load: 72, state: "Running" },
  { name: "M-02", load: 88, state: "Running" },
  { name: "M-03", load: 64, state: "Running" },
  { name: "M-04", load: 96, state: "At risk" },
  { name: "M-05", load: 58, state: "Running" },
  { name: "M-06", load: 43, state: "Idle" }
];

export const alerts = [
  { id: 1, level: "critical", title: "Assembly cycle time rising", detail: "M-04 · 18.2 min average, 24% above baseline", time: "4 min ago", tag: "Bottleneck risk" },
  { id: 2, level: "warning", title: "Material reserve running low", detail: "Composite resin · 1.3 days of estimated supply", time: "12 min ago", tag: "Inventory" },
  { id: 3, level: "info", title: "Inspection load normalised", detail: "M-05 · Queue returned within expected range", time: "28 min ago", tag: "Resolved trend" }
];
