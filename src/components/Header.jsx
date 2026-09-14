import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Bell, BellRing, Plus, Activity, Wifi, Clock,
  AlertTriangle, Flame, Droplets, Mountain, BarChart2,
  LogIn, LogOut, ChevronDown, User, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

const ROLE_BADGE = {
  admin: { label: 'Admin', cls: 'bg-critical/20 text-critical' },
  operator: { label: 'Operator', cls: 'bg-accent/20 text-accent' },
  citizen: { label: 'Citizen', cls: 'bg-low/20 text-low' },
};

export default function Header({
  totalIncidents,
  severityCounts,
  onReport,
  onToggleAlerts,
  showAlerts,
  isLive,
  onLogin,
  onDashboard,
  isDark,
  setIsDark
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

  const roleBadge = user ? ROLE_BADGE[user.role] || ROLE_BADGE.citizen : null;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="h-14 bg-bg-surface/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 z-50 relative shrink-0">
      {/* Left — Brand */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-critical rounded-full border-2 border-bg-surface animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-text-primary leading-none">
            ResQ<span className="text-primary">Map</span>{' '}
            <span className="text-accent text-xs font-medium">AI</span>
          </h1>
          <p className="text-[10px] text-text-muted font-medium tracking-wider uppercase">
            Command Centre
          </p>
        </div>
      </div>

      {/* Center — Live Stats */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-critical/15 text-critical text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {severityCounts.CRITICAL}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-high/15 text-high text-xs font-semibold">
              <Flame className="w-3 h-3" />
              {severityCounts.HIGH}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-moderate/15 text-moderate text-xs font-semibold">
              <Droplets className="w-3 h-3" />
              {severityCounts.MODERATE}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-low/15 text-low text-xs font-semibold">
              <Mountain className="w-3 h-3" />
              {severityCounts.LOW}
            </span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Activity className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-text-primary">{totalIncidents}</span>
            <span>Active</span>
          </div>
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        {/* Status */}
        <div className="hidden lg:flex items-center gap-3 mr-2 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${isLive ? 'text-low' : 'text-moderate'}`} />
            {isLive ? 'Live' : 'Offline'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-text-secondary">{formatTime(currentTime)}</span>
          </span>
        </div>
        
        {/* Theme Toggle button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </motion.button>

        {/* Dashboard button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDashboard}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          title="Analytics Dashboard"
        >
          <BarChart2 className="w-4.5 h-4.5" />
        </motion.button>

        {/* Alert button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleAlerts}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
            showAlerts
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-bg-elevated text-text-secondary hover:text-text-primary'
          }`}
        >
          {showAlerts ? <BellRing className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-critical rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {severityCounts.CRITICAL || '!'}
          </span>
        </motion.button>

        {/* Report button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold rounded-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Report Incident</span>
        </motion.button>

        {/* User menu */}
        <div className="relative">
          {user ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[10px] font-black">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-text-primary leading-none">{user.name.split(' ')[0]}</div>
                <div className={`text-[9px] font-bold px-1 py-0.5 rounded-full inline-block mt-0.5 ${roleBadge?.cls}`}>
                  {roleBadge?.label}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-text-muted" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-bg-elevated text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </motion.button>
          )}

          {/* Dropdown */}
          <AnimatePresence>
            {showUserMenu && user && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-border">
                  <div className="text-xs font-bold text-text-primary">{user.name}</div>
                  <div className="text-[10px] text-text-muted">{user.email}</div>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-critical/10 text-critical text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
