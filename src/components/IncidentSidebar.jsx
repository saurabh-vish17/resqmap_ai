import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronRight,
  MapPin,
  Users,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  getDisasterIcon,
  getSeverityColor,
  getSeverityBg,
  getStatusLabel,
  getStatusColor,
  SEVERITY_LEVELS,
  DISASTER_TYPES,
} from '../data/mockData';

export default function IncidentSidebar({
  incidents,
  selectedIncident,
  onSelectIncident,
  filterSeverity,
  setFilterSeverity,
  filterType,
  setFilterType,
  severityCounts,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = incidents.filter((inc) =>
    inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-bg-surface/60 backdrop-blur-xl border-r border-border flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-text-primary tracking-tight">Active Incidents</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showFilters ? 'bg-primary/20 text-primary' : 'hover:bg-bg-elevated text-text-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-bg-elevated/80 border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Severity quick filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 space-y-2">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Severity</p>
                <div className="flex gap-1">
                  <FilterPill
                    active={filterSeverity === 'ALL'}
                    onClick={() => setFilterSeverity('ALL')}
                    color="#94a3b8"
                    label="All"
                  />
                  {Object.entries(SEVERITY_LEVELS).map(([key, val]) => (
                    <FilterPill
                      key={key}
                      active={filterSeverity === key}
                      onClick={() => setFilterSeverity(key)}
                      color={val.color}
                      label={val.label}
                      count={severityCounts[key]}
                    />
                  ))}
                </div>

                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Type</p>
                <div className="flex gap-1">
                  <FilterPill
                    active={filterType === 'ALL'}
                    onClick={() => setFilterType('ALL')}
                    color="#94a3b8"
                    label="All"
                  />
                  {Object.entries(DISASTER_TYPES).map(([key, val]) => (
                    <FilterPill
                      key={key}
                      active={filterType === key}
                      onClick={() => setFilterType(key)}
                      color={val.color}
                      label={val.icon}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Severity Summary Bar */}
      <div className="px-3 py-2 border-b border-border flex gap-1">
        {Object.entries(severityCounts).map(([key, count]) => (
          <div
            key={key}
            className="flex-1 text-center py-1 rounded-md"
            style={{ backgroundColor: getSeverityBg(key) }}
          >
            <span className="text-xs font-bold" style={{ color: getSeverityColor(key) }}>
              {count}
            </span>
            <p className="text-[9px] text-text-muted capitalize">
              {key.toLowerCase()}
            </p>
          </div>
        ))}
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {filtered.map((incident, index) => (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectIncident(incident)}
              className={`px-3 py-2.5 border-b border-border/50 cursor-pointer transition-all group ${
                selectedIncident?.id === incident.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-bg-elevated/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Severity dot + icon */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getSeverityColor(incident.severity) }}
                  />
                  <span className="text-sm">{getDisasterIcon(incident.type)}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono font-semibold text-text-muted">
                      #{incident.id}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                      style={{
                        color: getStatusColor(incident.status),
                        backgroundColor: `${getStatusColor(incident.status)}15`,
                      }}
                    >
                      {getStatusLabel(incident.status)}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-text-primary truncate leading-tight">
                    {incident.title}
                  </h3>
                  <div className="flex items-center gap-2.5 mt-1 text-[10px] text-text-muted">
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" />
                      {incident.reportCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5" />
                      ~{incident.peopleAffected}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {incident.priorityScore}
                    </span>
                  </div>
                </div>

                {/* Priority badge */}
                <div className="flex flex-col items-end gap-1">
                  <div
                    className="text-xs font-bold px-2 py-0.5 rounded-md"
                    style={{
                      color: getSeverityColor(incident.severity),
                      backgroundColor: getSeverityBg(incident.severity),
                    }}
                  >
                    {incident.priorityScore}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No incidents found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, color, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
        active
          ? 'ring-1 ring-offset-1 ring-offset-bg-surface'
          : 'opacity-60 hover:opacity-100'
      }`}
      style={{
        color: active ? color : '#94a3b8',
        backgroundColor: active ? `${color}20` : 'transparent',
        ringColor: active ? color : 'transparent',
      }}
    >
      {label}
      {count !== undefined && <span className="ml-1">({count})</span>}
    </button>
  );
}
