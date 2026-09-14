import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { X, TrendingUp, Activity, Shield, Truck, AlertTriangle, Users, BarChart2 } from 'lucide-react';
import { fetchIncidentStats, fetchResources } from '../api/apiClient';
import { getSeverityColor } from '../data/mockData';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

const TYPE_COLORS = {
  FLOOD: '#06b6d4',
  FIRE: '#ef4444',
  LANDSLIDE: '#a16207',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-surface border border-border rounded-xl px-3 py-2 shadow-xl">
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ onClose }) {
  const [stats, setStats] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, r] = await Promise.all([fetchIncidentStats(), fetchResources()]);
      setStats(s);
      setResources(r || []);
      setLoading(false);
    }
    load();
  }, []);

  const severityData = stats
    ? Object.entries(stats.by_severity).map(([name, value]) => ({ name, value }))
    : [];

  const typeData = stats
    ? Object.entries(stats.by_type).map(([name, value]) => ({ name, value }))
    : [];

  // Resource availability breakdown
  const resourceAvailability = {
    AVAILABLE: resources.filter((r) => r.availability === 'AVAILABLE').length,
    DISPATCHED: resources.filter((r) => r.availability === 'DISPATCHED').length,
    OFFLINE: resources.filter((r) => r.availability === 'OFFLINE').length,
  };
  const resourceDonut = Object.entries(resourceAvailability).map(([name, value]) => ({ name, value }));

  const RESOURCE_COLORS = { AVAILABLE: '#22c55e', DISPATCHED: '#f97316', OFFLINE: '#6b7280' };

  const StatCard = ({ icon: Icon, label, value, color, sub }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-bg-elevated/50 border border-border hover:border-border-light transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-bg-primary/95 backdrop-blur-xl overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary">Analytics Dashboard</h1>
            <p className="text-[10px] text-text-muted">ResQMap AI — Live Command Overview</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={AlertTriangle} label="Total Incidents" value={stats?.total ?? 0} color="#ef4444" sub="All time" />
            <StatCard icon={Shield} label="Critical" value={stats?.by_severity?.CRITICAL ?? 0} color="#ef4444" sub="Needs immediate response" />
            <StatCard icon={Truck} label="Resources" value={resources.length} color="#06b6d4" sub={`${resourceAvailability.AVAILABLE} available`} />
            <StatCard icon={Activity} label="Response Rate" value="94%" color="#22c55e" sub="Last 24 hours" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Severity Donut */}
            <div className="p-4 rounded-xl bg-bg-elevated/50 border border-border">
              <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                Incidents by Severity
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="value" strokeWidth={2} stroke="var(--color-bg-elevated)">
                      {severityData.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {severityData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[d.name] }} />
                      <span className="text-[11px] text-text-secondary flex-1">{d.name}</span>
                      <span className="text-xs font-bold text-text-primary">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Type Bar Chart */}
            <div className="p-4 rounded-xl bg-bg-elevated/50 border border-border">
              <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-accent" />
                Incidents by Disaster Type
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={typeData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]}>
                    {typeData.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resource Status + Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resource Donut */}
            <div className="p-4 rounded-xl bg-bg-elevated/50 border border-border">
              <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-accent" />
                Resource Availability
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={150}>
                  <PieChart>
                    <Pie data={resourceDonut} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      dataKey="value" strokeWidth={2} stroke="var(--color-bg-elevated)">
                      {resourceDonut.map((entry) => (
                        <Cell key={entry.name} fill={RESOURCE_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {resourceDonut.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RESOURCE_COLORS[d.name] }} />
                      <span className="text-[11px] text-text-secondary flex-1">{d.name}</span>
                      <span className="text-xs font-bold text-text-primary">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resource List */}
            <div className="p-4 rounded-xl bg-bg-elevated/50 border border-border">
              <h3 className="text-xs font-bold text-text-primary mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Resource Fleet — Top 5
              </h3>
              <div className="space-y-2">
                {resources.slice(0, 5).map((r) => (
                  <div key={r.resource_code} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-bg-primary/40 hover:bg-bg-primary/60 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: RESOURCE_COLORS[r.availability] || '#6b7280' }} />
                    <span className="text-[11px] font-semibold text-text-primary flex-1">{r.name}</span>
                    <span className="text-[10px] text-text-muted">{r.type}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: RESOURCE_COLORS[r.availability],
                        backgroundColor: `${RESOURCE_COLORS[r.availability]}20`,
                      }}
                    >
                      {r.availability}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Severity breakdown bar */}
          <div className="p-4 rounded-xl bg-bg-elevated/50 border border-border">
            <h3 className="text-xs font-bold text-text-primary mb-4">Priority Distribution</h3>
            <div className="flex rounded-lg overflow-hidden h-6">
              {severityData.map((d) => {
                const total = severityData.reduce((s, x) => s + x.value, 0) || 1;
                const pct = (d.value / total) * 100;
                return (
                  <div
                    key={d.name}
                    className="relative group transition-all"
                    style={{ width: `${pct}%`, backgroundColor: SEVERITY_COLORS[d.name] }}
                  >
                    {pct > 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                        {d.value}
                      </span>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-bg-surface border border-border rounded text-[10px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {d.name}: {d.value} ({pct.toFixed(0)}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2.5">
              {severityData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: SEVERITY_COLORS[d.name] }} />
                  <span className="text-[10px] text-text-muted">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
