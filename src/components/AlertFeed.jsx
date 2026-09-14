import { motion } from 'framer-motion';
import { X, Bell, AlertTriangle, Flame, Droplets, Mountain, ChevronRight } from 'lucide-react';
import { recentAlerts, SEVERITY_LEVELS } from '../data/mockData';

export default function AlertFeed({ onClose }) {
  const getAlertIcon = (type) => {
    const icons = {
      CRITICAL: <AlertTriangle className="w-3.5 h-3.5 text-critical" />,
      HIGH: <Flame className="w-3.5 h-3.5 text-high" />,
      MODERATE: <Droplets className="w-3.5 h-3.5 text-moderate" />,
      LOW: <Mountain className="w-3.5 h-3.5 text-low" />,
    };
    return icons[type] || <Bell className="w-3.5 h-3.5 text-text-muted" />;
  };

  const getColor = (type) => SEVERITY_LEVELS[type]?.color || '#94a3b8';

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 bg-bg-surface/80 backdrop-blur-xl border-l border-border flex flex-col overflow-hidden shrink-0"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Live Alerts</h2>
            <p className="text-[10px] text-text-muted">{recentAlerts.length} recent</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentAlerts.map((alert, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="px-4 py-3 border-b border-border/50 hover:bg-bg-elevated/30 cursor-pointer transition-colors group">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-secondary leading-relaxed">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono text-text-muted">{alert.time}</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ color: getColor(alert.type), backgroundColor: `${getColor(alert.type)}15` }}>
                    {alert.type}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-3 border-t border-border">
        <button className="w-full py-2 text-[10px] font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer">
          View All Alerts
        </button>
      </div>
    </motion.div>
  );
}
