import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSeverityColor, getDisasterIcon, getDisasterColor, resources } from '../data/mockData';

// Custom marker icon creator
function createDivIcon(incident) {
  const color = getSeverityColor(incident.severity);
  const icon = getDisasterIcon(incident.type);
  const isCritical = incident.severity === 'CRITICAL';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative; display:flex; align-items:center; justify-content:center;">
        ${isCritical ? `<div style="position:absolute; width:40px; height:40px; border-radius:50%; background:${color}30; animation: pulse-ring 2s ease-out infinite;"></div>` : ''}
        <div style="
          width:32px; height:32px;
          border-radius:50%;
          background: radial-gradient(circle at 30% 30%, ${color}, ${color}cc);
          border: 2px solid ${color};
          display:flex; align-items:center; justify-content:center;
          font-size:14px;
          box-shadow: 0 4px 12px ${color}60;
          cursor: pointer;
          transition: transform 0.2s;
          ${isCritical ? `animation: glow 2s ease-in-out infinite;` : ''}
        " class="${isCritical ? 'marker-critical' : ''}">
          ${icon}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function createResourceIcon(resource) {
  const isDispatched = resource.status === 'DISPATCHED';
  return L.divIcon({
    className: 'resource-marker',
    html: `
      <div style="
        width:26px; height:26px;
        border-radius:8px;
        background: ${isDispatched ? '#f97316' : 'var(--app-bg-elevated)'};
        border: 2px solid ${isDispatched ? '#f97316' : '#374151'};
        display:flex; align-items:center; justify-content:center;
        font-size:12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${resource.icon}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

// Component to fly to selected incident
function FlyToIncident({ incident }) {
  const map = useMap();

  useEffect(() => {
    if (incident) {
      map.flyTo([incident.latitude, incident.longitude], 14, {
        duration: 1.2,
      });
    }
  }, [incident, map]);

  return null;
}

export default function MapView({ incidents, selectedIncident, onSelectIncident, isDark }) {
  const center = [19.076, 72.8777]; // Mumbai center

  // Generate route line for selected incident
  const routePoints = useMemo(() => {
    if (!selectedIncident || !selectedIncident.nearestResources?.length) return null;

    const resource = selectedIncident.nearestResources[0];
    
    // Check if we have true OSRM Phase 9 GeoJSON driving shape!
    if (resource.route_geometry && resource.route_geometry.coordinates) {
      // OSRM provides [lon, lat], Leaflet wants [lat, lon]
      return resource.route_geometry.coordinates.map(coord => [coord[1], coord[0]]);
    }

    // Fallback: Simulate a route with intermediate points if offline
    const resourceData = resources.find((r) => r.id === resource.id);
    if (!resourceData) return null;

    const start = [resourceData.lat, resourceData.lng];
    const end = [selectedIncident.latitude, selectedIncident.longitude];
    const mid1 = [(start[0] + end[0]) / 2 + 0.003, (start[1] + end[1]) / 2 - 0.005];
    const mid2 = [(start[0] + end[0]) / 2 - 0.002, (start[1] + end[1]) / 2 + 0.003];

    return [start, mid1, mid2, end];
  }, [selectedIncident]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="w-full h-full"
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        key={isDark ? 'dark' : 'light'}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/${isDark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`}
      />

      <FlyToIncident incident={selectedIncident} />

      {/* Incident markers */}
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={createDivIcon(incident)}
          eventHandlers={{
            click: () => onSelectIncident(incident),
          }}
        >
          <Popup>
            <div style={{ minWidth: '200px', padding: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{getDisasterIcon(incident.type)}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>{incident.title}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Event #{incident.id}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--color-bg-elevated)' }}>
                  <span style={{ color: '#94a3b8' }}>Priority</span>
                  <div style={{ fontWeight: '700', color: getSeverityColor(incident.severity) }}>{incident.priorityScore}/100</div>
                </div>
                <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--color-bg-elevated)' }}>
                  <span style={{ color: '#94a3b8' }}>Confidence</span>
                  <div style={{ fontWeight: '700', color: '#06b6d4' }}>{incident.confidence}%</div>
                </div>
                <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--color-bg-elevated)' }}>
                  <span style={{ color: '#94a3b8' }}>Reports</span>
                  <div style={{ fontWeight: '700', color: '#f1f5f9' }}>{incident.reportCount}</div>
                </div>
                <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--color-bg-elevated)' }}>
                  <span style={{ color: '#94a3b8' }}>Affected</span>
                  <div style={{ fontWeight: '700', color: '#f1f5f9' }}>~{incident.peopleAffected}</div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Affected area circles */}
      {incidents.map((incident) => (
        <Circle
          key={`circle-${incident.id}`}
          center={[incident.latitude, incident.longitude]}
          radius={incident.area * 500}
          pathOptions={{
            color: getSeverityColor(incident.severity),
            fillColor: getSeverityColor(incident.severity),
            fillOpacity: selectedIncident?.id === incident.id ? 0.15 : 0.08,
            weight: selectedIncident?.id === incident.id ? 2 : 1,
            dashArray: selectedIncident?.id === incident.id ? '' : '5,5',
          }}
        />
      ))}

      {/* Resource markers */}
      {resources.map((resource) => (
        <Marker
          key={`resource-${resource.id}`}
          position={[resource.lat, resource.lng]}
          icon={createResourceIcon(resource)}
        >
          <Popup>
            <div style={{ minWidth: '160px', padding: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                {resource.icon} {resource.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{resource.type}</div>
              <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: resource.status === 'AVAILABLE' ? '#22c55e20' : '#f9731620',
                  color: resource.status === 'AVAILABLE' ? '#22c55e' : '#f97316',
                  fontWeight: '600',
                }}>
                  {resource.status}
                </span>
                <span style={{ color: '#94a3b8' }}>Cap: {resource.capacity}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route line */}
      {routePoints && (
        <Polyline
          positions={routePoints}
          pathOptions={{
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            dashArray: '10,8',
          }}
        />
      )}
    </MapContainer>
  );
}
