// API client for connecting React frontend to FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

// ─── Mappers ───────────────────────────────────────────────────────────────

function mapIncident(inc) {
  return {
    id: inc.event_code,
    backendId: inc.id,
    type: inc.disaster_type,
    title: inc.title,
    latitude: inc.latitude,
    longitude: inc.longitude,
    severity: inc.severity,
    priorityScore: inc.priority_score,
    confidence: inc.confidence,
    status: inc.status,
    reportCount: inc.report_count,
    area: inc.area_km2,
    firstReport: inc.first_report_at
      ? new Date(inc.first_report_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--',
    latestReport: inc.latest_report_at
      ? new Date(inc.latest_report_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--',
    peopleAffected: inc.people_affected,
    description: inc.description,
    aiExplanation: inc.ai_explanation || {
      disasterType: inc.disaster_type,
      confidence: inc.confidence,
      imageEvidence: 'High severity visual features detected',
      textEvidence: 'Multiple reports of emergency conditions',
      locationEvidence: 'High-risk geographic zone',
      corroboration: `${inc.report_count} citizen reports corroborated`,
      severityBreakdown: [
        { factor: 'Report Density', score: 25, detail: `${inc.report_count} reports in area` },
        {
          factor: 'Population at Risk',
          score: 20,
          detail: `~${inc.people_affected} people affected`,
        },
      ],
    },
    nearestResources: (inc.nearest_resources || []).map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      distance: r.distance,
      eta: r.eta,
      status: r.status,
      capacity: r.capacity,
      route_geometry: r.route_geometry || null,
    })),
  };
}

// ─── Incidents ─────────────────────────────────────────────────────────────

export async function fetchIncidents(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.severity && filters.severity !== 'ALL')
      params.append('severity', filters.severity);
    if (filters.type && filters.type !== 'ALL')
      params.append('disaster_type', filters.type);

    const res = await fetch(`${API_BASE_URL}/incidents/?${params.toString()}`);
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    return data.map(mapIncident);
  } catch (err) {
    console.warn('Backend offline, falling back to local data:', err);
    return null;
  }
}

export async function fetchIncidentDetails(incidentId) {
  try {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`);
    if (!res.ok) throw new Error('Failed to fetch incident details');
    const inc = await res.json();
    return mapIncident(inc);
  } catch (err) {
    console.error('Error fetching incident details:', err);
    return null;
  }
}

export async function fetchIncidentStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/incidents/stats`);
    if (!res.ok) throw new Error('Stats request failed');
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Resources ─────────────────────────────────────────────────────────────

export async function fetchResources() {
  try {
    const res = await fetch(`${API_BASE_URL}/resources/`);
    if (!res.ok) throw new Error('Resources request failed');
    return await res.json();
  } catch {
    return null;
  }
}

export async function dispatchResource(incidentId, resourceCode, token = '') {
  const res = await fetch(
    `${API_BASE_URL}/incidents/${incidentId}/dispatch?resource_code=${resourceCode}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Dispatch failed');
  return data;
}

// ─── Reports ───────────────────────────────────────────────────────────────

/**
 * Submit a citizen disaster report (multipart/form-data). Auth optional.
 * @param {{ description: string, latitude: number, longitude: number, disasterTypeHint?: string, image?: File }} payload
 * @param {string|null} token - JWT access token or null for guest
 */
export async function submitReport(payload, token = null) {
  const form = new FormData();
  form.append('latitude', payload.latitude);
  form.append('longitude', payload.longitude);
  if (payload.description) form.append('description', payload.description);
  if (payload.disasterTypeHint) form.append('disaster_type_hint', payload.disasterTypeHint);
  if (payload.image) form.append('image', payload.image);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/reports/`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Report submission failed');
  return data;
}

/**
 * Fetch the current user's own reports (requires auth).
 * @param {string} token
 */
export async function fetchMyReports(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/reports/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}


// ─── Alerts (recent high-severity) ────────────────────────────────────────

export async function fetchAlerts() {
  try {
    const res = await fetch(`${API_BASE_URL}/incidents/?severity=CRITICAL`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 10).map(mapIncident);
  } catch {
    return [];
  }
}
