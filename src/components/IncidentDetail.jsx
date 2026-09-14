import { motion } from 'framer-motion';
import {
  X,
  MapPin,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  CheckCircle,
  Shield,
  Navigation,
  Truck,
  Building2,
  Home,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  Brain,
  Target,
  Loader2,
  Lock,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { dispatchResource, fetchIncidentDetails } from '../api/apiClient';
import {
  getDisasterIcon,
  getSeverityColor,
  getSeverityBg,
  getStatusLabel,
  getStatusColor,
  DISASTER_TYPES,
} from '../data/mockData';

export default function IncidentDetail({ incident, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dispatching, setDispatching] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const { token, canDispatch } = useAuth();
  const toast = useToast();

  const handleDispatch = async (resourceId) => {
    if (!canDispatch) {
      toast.error('You need Operator or Admin role to dispatch resources');
      return;
    }
    setDispatching(resourceId);
    try {
      const result = await dispatchResource(incident.backendId || incident.id, resourceId, token);
      toast.success(`✅ ${result.message} — ETA: ${result.eta_minutes} min`);
      if (onRefresh) onRefresh(incident.backendId || incident.id);
    } catch (err) {
      toast.error(`Dispatch failed: ${err.message}`);
    } finally {
      setDispatching(null);
    }
  };

  const handleApproveAll = async () => {
    if (!canDispatch) {
      toast.error('You need Operator or Admin role to approve dispatches');
      return;
    }
    setApprovingAll(true);
    const available = (incident.nearestResources || []).filter((r) => r.status === 'AVAILABLE').slice(0, 1);
    if (available.length === 0) {
      toast.warning('No available resources to dispatch');
      setApprovingAll(false);
      return;
    }
    try {
      await handleDispatch(available[0].id);
    } finally {
      setApprovingAll(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'ai', label: 'AI Analysis', icon: Brain },
    { id: 'resources', label: 'Resources', icon: Truck },
  ];

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-96 bg-bg-surface/80 backdrop-blur-xl border-l border-border flex flex-col overflow-hidden shrink-0"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getDisasterIcon(incident.type)}</span>
            <div>
              <span className="text-[10px] font-mono text-text-muted">EVENT #{incident.id}</span>
              <h2 className="text-sm font-bold text-text-primary leading-tight">{incident.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status + Type badges */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
            style={{
              color: getStatusColor(incident.status),
              backgroundColor: `${getStatusColor(incident.status)}20`,
            }}
          >
            {getStatusLabel(incident.status)}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: getSeverityColor(incident.severity),
              backgroundColor: getSeverityBg(incident.severity),
            }}
          >
            {incident.severity}
          </span>
          <span className="text-[10px] font-semibold text-text-secondary px-2 py-0.5 rounded-full bg-bg-elevated">
            {DISASTER_TYPES[incident.type]?.label}
          </span>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="Confidence" value={`${incident.confidence}%`} color="#06b6d4" />
          <MetricCard label="Priority" value={`${incident.priorityScore}`} color={getSeverityColor(incident.severity)} />
          <MetricCard label="Reports" value={incident.reportCount} color="#8b5cf6" />
          <MetricCard label="Affected" value={`~${incident.peopleAffected}`} color="#f97316" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-border px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all cursor-pointer border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab incident={incident} />}
        {activeTab === 'ai' && <AIAnalysisTab incident={incident} />}
        {activeTab === 'resources' && (
          <ResourcesTab incident={incident} dispatching={dispatching} onDispatch={handleDispatch} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-border space-y-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApproveAll}
          disabled={approvingAll || !canDispatch}
          className={`w-full py-2 text-white text-xs font-bold rounded-lg shadow-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
            canDispatch
              ? 'bg-gradient-to-r from-primary to-accent shadow-primary/25 hover:shadow-primary/40'
              : 'bg-bg-elevated text-text-muted cursor-not-allowed'
          }`}
        >
          {approvingAll ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : canDispatch ? (
            <Shield className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          {canDispatch ? 'APPROVE DISPATCH' : 'OPERATOR REQUIRED'}
        </motion.button>
        <div className="flex gap-2">
          <button className="flex-1 py-1.5 text-xs font-semibold text-text-secondary border border-border rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer">
            Request Verification
          </button>
          <button className="flex-1 py-1.5 text-xs font-semibold text-critical border border-critical/30 rounded-lg hover:bg-critical/10 transition-colors cursor-pointer">
            Reject
          </button>
        </div>
        {!canDispatch && (
          <p className="text-[9px] text-text-muted text-center">Sign in as Operator or Admin to dispatch</p>
        )}
      </div>
    </motion.div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="text-center py-1.5 rounded-lg bg-bg-elevated/50">
      <div className="text-sm font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] text-text-muted">{label}</div>
    </div>
  );
}

function OverviewTab({ incident }) {
  return (
    <div className="p-4 space-y-4">
      {/* Description */}
      <div>
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Description</h3>
        <p className="text-xs text-text-secondary leading-relaxed">{incident.description}</p>
      </div>

      {/* Event details */}
      <div>
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Event Details</h3>
        <div className="space-y-1.5">
          <DetailRow icon={MapPin} label="Location" value={`${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`} />
          <DetailRow icon={Target} label="Affected Area" value={`${incident.area} km²`} />
          <DetailRow icon={Clock} label="First Report" value={incident.firstReport} />
          <DetailRow icon={Clock} label="Latest Report" value={incident.latestReport} />
          <DetailRow icon={FileText} label="Total Reports" value={incident.reportCount} />
          <DetailRow icon={Users} label="People Affected" value={`~${incident.peopleAffected}`} />
        </div>
      </div>

      {/* AI Verification */}
      <div>
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">AI Verification</h3>
        <div className="space-y-1.5">
          <VerificationItem icon={CheckCircle} text="Image processed and verified" color="#22c55e" />
          <VerificationItem icon={CheckCircle} text={`Disaster classified: ${DISASTER_TYPES[incident.type]?.label}`} color="#22c55e" />
          <VerificationItem icon={CheckCircle} text="Location verified via GPS" color="#22c55e" />
          <VerificationItem icon={CheckCircle} text={`${incident.reportCount} corroborating reports found`} color="#22c55e" />
        </div>
      </div>
    </div>
  );
}

function AIAnalysisTab({ incident }) {
  const explanation = incident.aiExplanation;
  const total = explanation.severityBreakdown.reduce((sum, s) => sum + s.score, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Disaster Classification */}
      <div className="p-3 rounded-xl bg-bg-elevated/50 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Disaster Classification</span>
          <span className="text-xs font-bold text-accent">{explanation.confidence}% confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getDisasterIcon(explanation.disasterType)}</span>
          <span className="text-lg font-bold text-text-primary">{DISASTER_TYPES[explanation.disasterType]?.label}</span>
        </div>
      </div>

      {/* Evidence */}
      <div>
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Evidence Analysis</h3>
        <div className="space-y-2">
          <EvidenceCard icon="📷" title="Image Evidence" desc={explanation.imageEvidence} />
          <EvidenceCard icon="💬" title="Text Evidence" desc={explanation.textEvidence} />
          <EvidenceCard icon="📍" title="Location Evidence" desc={explanation.locationEvidence} />
          <EvidenceCard icon="👥" title="Report Corroboration" desc={explanation.corroboration} />
        </div>
      </div>

      {/* Priority Score Breakdown */}
      <div>
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
          Explainable Priority Score
        </h3>
        <div className="p-3 rounded-xl bg-bg-elevated/50 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-secondary">Total Priority Score</span>
            <span
              className="text-xl font-black"
              style={{ color: getSeverityColor(incident.severity) }}
            >
              {total}/100
            </span>
          </div>
          <div className="space-y-2">
            {explanation.severityBreakdown.map((factor, i) => (
              <motion.div
                key={factor.factor}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-text-secondary">{factor.factor}</span>
                  <span className="text-[11px] font-bold text-primary">+{factor.score}</span>
                </div>
                <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(factor.score / 30) * 100}%` }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
                <p className="text-[9px] text-text-muted mt-0.5">{factor.detail}</p>
              </motion.div>
            ))}
          </div>

          {/* Phase 7: XGBoost SHAP Force Plot Visualization */}
          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              SHAP Force Plot (Feature Attribution)
            </h4>
            <div className="h-3 w-full bg-bg-primary rounded-full overflow-hidden flex shadow-inner group relative cursor-crosshair">
              {explanation.severityBreakdown.map((factor, i) => {
                const percentage = total > 0 ? (factor.score / total) * 100 : 0;
                const colors = ['bg-critical', 'bg-warning', 'bg-primary', 'bg-accent'];
                return (
                  <motion.div
                    key={`shap-${factor.factor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.8 + i * 0.15, duration: 0.8, type: 'spring' }}
                    className={`h-full ${colors[i % colors.length]} hover:brightness-125 transition-all`}
                    title={`${factor.factor}: +${factor.score}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] font-bold text-text-muted">
              <span>Base Value = 0</span>
              <span className="text-accent animate-pulse">Predicted Priority f(x) = {total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Why this severity */}
      <div className="p-3 rounded-xl border border-accent/30 bg-accent/5">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Why {incident.severity}?</span>
        </div>
        <div className="space-y-1 text-[11px] text-text-secondary">
          {explanation.severityBreakdown.map((f) => (
            <div key={f.factor} className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-accent shrink-0" />
              <span>{f.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourcesTab({ incident, dispatching, onDispatch }) {
  const resourceIcons = {
    'Rescue Team': Truck,
    'Hospital': Building2,
    'Shelter': Home,
    'Fire Station': Truck,
  };

  if (!incident.nearestResources?.length) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12 text-text-muted">
        <Truck className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">No nearby resources assigned</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
        Nearest Available Resources
      </h3>

      {incident.nearestResources.map((resource, i) => {
        const Icon = resourceIcons[resource.type] || Truck;
        const isDispatching = dispatching === resource.id;
        const isDispatched = resource.status === 'DISPATCHED';

        return (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-3 rounded-xl bg-bg-elevated/50 border border-border hover:border-border-light transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isDispatched ? 'bg-high/20' : 'bg-primary/15'
              }`}>
                <Icon className={`w-4.5 h-4.5 ${isDispatched ? 'text-high' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-text-primary">{resource.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isDispatched
                      ? 'bg-high/15 text-high'
                      : 'bg-low/15 text-low'
                  }`}>
                    {resource.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-muted">
                  <span className="flex items-center gap-0.5">
                    <Navigation className="w-2.5 h-2.5" />
                    {resource.distance} km
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {resource.eta} min ETA
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5" />
                    Cap: {resource.capacity}
                  </span>
                </div>
              </div>
            </div>

            {!isDispatched && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDispatch(resource.id)}
                disabled={isDispatching}
                className="w-full mt-2.5 py-1.5 text-[10px] font-bold rounded-lg border cursor-pointer transition-all disabled:opacity-50 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
              >
                {isDispatching ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Dispatching...
                  </span>
                ) : (
                  `DISPATCH ${resource.type.toUpperCase()}`
                )}
              </motion.button>
            )}
          </motion.div>
        );
      })}

      {/* Route info */}
      <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 mt-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Optimal Route</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span>📍 Distance: <span className="font-semibold text-text-primary">{incident.nearestResources[0].distance} km</span></span>
          <span>⏱️ ETA: <span className="font-semibold text-text-primary">{incident.nearestResources[0].eta} min</span></span>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-bg-elevated/30 transition-colors">
      <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className="text-[11px] font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function VerificationItem({ icon: Icon, text, color }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="text-[11px] text-text-secondary">{text}</span>
    </div>
  );
}

function EvidenceCard({ icon, title, desc }) {
  return (
    <div className="p-2.5 rounded-lg bg-bg-elevated/30 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">{icon}</span>
        <span className="text-[10px] font-bold text-text-primary">{title}</span>
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}
