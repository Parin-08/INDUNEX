const API_BASE = "/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "indunex-demo-key-2026",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || `Request failed (${response.status})`);
  }
  return payload.data;
}

const query = (params) => new URLSearchParams(params).toString();
const json = (body) => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  factories: () => request("/factories"),
  overview: (factoryId) => request(`/dashboard/overview?${query({ factory_id: factoryId })}`),
  processes: (factoryId) => request(`/processes?${query({ factory_id: factoryId })}`),
  dependencies: (factoryId) => request(`/dependencies?${query({ factory_id: factoryId })}`),
  machines: (factoryId) => request(`/machines?${query({ factory_id: factoryId })}`),
  telemetry: (factoryId) => request(`/telemetry?${query({ factory_id: factoryId, limit: 30 })}`),
  predictions: (factoryId) => request(`/predictions?${query({ factory_id: factoryId })}`),
  evaluatePredictions: (factoryId) => request("/predictions/evaluate", json({ factory_id: factoryId })),
  alerts: (factoryId) => request(`/alerts?${query({ factory_id: factoryId })}`),
  inventory: (factoryId) => request(`/inventory?${query({ factory_id: factoryId })}`),
  interventions: (factoryId) => request(`/interventions?${query({ factory_id: factoryId })}`),
  settings: (factoryId) => request(`/settings?${query({ factory_id: factoryId })}`),
  saveSettings: (id, factoryId, body) => request(`/settings/${id}?${query({ factory_id: factoryId })}`, { method: "PATCH", body: JSON.stringify(body) }),
  simulate: (body) => request("/simulations/run", json(body)),
  simulation: (id, factoryId) => request(`/simulations/${id}?${query({ factory_id: factoryId })}`),
  previewIntervention: (body) => request("/interventions/preview", json(body)),
  approveIntervention: (id, factoryId) => request(`/interventions/${id}/approve?${query({ factory_id: factoryId })}`, json({})),
  executeIntervention: (id, factoryId) => request(`/interventions/${id}/execute?${query({ factory_id: factoryId })}`, json({})),
};
