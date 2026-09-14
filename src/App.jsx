import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import IncidentSidebar from './components/IncidentSidebar';
import MapView from './components/MapView';
import IncidentDetail from './components/IncidentDetail';
import AlertFeed from './components/AlertFeed';
import ReportModal from './components/ReportModal';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import CitizenPortal from './components/CitizenPortal';
import { incidents as mockIncidents } from './data/mockData';
import { fetchIncidents, fetchIncidentDetails } from './api/apiClient';
import { useToast } from './hooks/useToast.jsx';

const POLL_INTERVAL = 30_000; // 30 seconds

function App() {
  const [incidentsList, setIncidentsList] = useState(mockIncidents);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showCitizenPortal, setShowCitizenPortal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const prevIdsRef = useRef(new Set());
  const toast = useToast();

  const loadIncidents = useCallback(
    async (showNewAlert = false) => {
      const data = await fetchIncidents({ severity: filterSeverity, type: filterType });
      if (data && data.length > 0) {
        if (showNewAlert && prevIdsRef.current.size > 0) {
          const newIds = data.filter((i) => !prevIdsRef.current.has(i.id));
          if (newIds.length > 0) {
            setNewAlertCount((c) => c + newIds.length);
            toast.warning(`🚨 ${newIds.length} new incident${newIds.length > 1 ? 's' : ''} detected!`);
          }
        }
        prevIdsRef.current = new Set(data.map((i) => i.id));
        setIncidentsList(data);
        setIsLive(true);
      }
    },
    [filterSeverity, filterType, toast]
  );

  // Initial load
  useEffect(() => {
    loadIncidents(false);
  }, [loadIncidents]);

  // Dark mode effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(() => loadIncidents(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadIncidents]);

  const handleSelectIncident = async (incident) => {
    if (!incident) {
      setSelectedIncident(null);
      return;
    }
    setSelectedIncident(incident); // Immediate optimistic
    const detailed = await fetchIncidentDetails(incident.backendId || incident.id);
    if (detailed) setSelectedIncident(detailed);
  };

  const handleRefreshSelected = async (incidentId) => {
    const detailed = await fetchIncidentDetails(incidentId);
    if (detailed) setSelectedIncident(detailed);
    await loadIncidents(false);
  };

  const filteredIncidents = incidentsList.filter((inc) => {
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterType !== 'ALL' && inc.type !== filterType) return false;
    return true;
  });

  const severityCounts = {
    CRITICAL: incidentsList.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: incidentsList.filter((i) => i.severity === 'HIGH').length,
    MODERATE: incidentsList.filter((i) => i.severity === 'MODERATE').length,
    LOW: incidentsList.filter((i) => i.severity === 'LOW').length,
  };

  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      <Header
        totalIncidents={incidentsList.length}
        severityCounts={severityCounts}
        onReport={() => setShowCitizenPortal(true)}
        onToggleAlerts={() => {
          setShowAlerts(!showAlerts);
          setNewAlertCount(0);
        }}
        showAlerts={showAlerts}
        isLive={isLive}
        onLogin={() => setShowAuthModal(true)}
        onDashboard={() => setShowDashboard(true)}
        newAlertCount={newAlertCount}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Sidebar */}
        <IncidentSidebar
          incidents={filteredIncidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          filterSeverity={filterSeverity}
          setFilterSeverity={setFilterSeverity}
          filterType={filterType}
          setFilterType={setFilterType}
          severityCounts={severityCounts}
        />

        {/* Center — Map */}
        <div className="flex-1 relative">
          <MapView
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            isDark={isDark}
          />
        </div>

        {/* Right Panel */}
        <AnimatePresence>
          {selectedIncident ? (
            <IncidentDetail
              key="detail"
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
              onRefresh={handleRefreshSelected}
            />
          ) : showAlerts ? (
            <AlertFeed key="alerts" onClose={() => setShowAlerts(false)} />
          ) : null}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showReportModal && (
          <ReportModal
            key="report"
            onClose={() => setShowReportModal(false)}
            onSubmitted={() => loadIncidents(false)}
          />
        )}
        {showAuthModal && (
          <AuthModal key="auth" onClose={() => setShowAuthModal(false)} />
        )}
        {showDashboard && (
          <Dashboard key="dashboard" onClose={() => setShowDashboard(false)} />
        )}
      </AnimatePresence>

      {/* Citizen Portal — Full-screen overlay */}
      <AnimatePresence>
        {showCitizenPortal && (
          <motion.div
            key="citizen-portal"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 z-[9999] bg-bg-primary overflow-y-auto"
          >
            <CitizenPortal
              isDark={isDark}
              onBack={() => {
                setShowCitizenPortal(false);
                loadIncidents(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
