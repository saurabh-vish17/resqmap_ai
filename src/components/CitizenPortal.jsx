import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowLeft, AlertTriangle, Droplets, Flame, Mountain,
  Camera, MapPin, FileText, Send, CheckCircle, Loader2, XCircle,
  Brain, ChevronRight, Info, RefreshCw, Eye, Clock, Hash,
  LogIn, UserCircle, Navigation, X, Image as ImageIcon,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { submitReport, fetchMyReports } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import AuthModal from './AuthModal';

// ── Disaster type config ──────────────────────────────────────────────────
const DISASTER_TYPES = [
  {
    id: 'FLOOD',
    emoji: '🌊',
    label: 'Flood',
    color: '#06b6d4',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
    keywords: ['water', 'flooding', 'waterlogged', 'submerged', 'rain'],
    hints: 'Water level rising? Roads submerged? People stranded?',
  },
  {
    id: 'FIRE',
    emoji: '🔥',
    label: 'Fire',
    color: '#ef4444',
    bg: 'bg-red-500/15',
    border: 'border-red-500/40',
    keywords: ['fire', 'burning', 'smoke', 'flames', 'blaze'],
    hints: 'Building on fire? Wildfire? Gas explosion?',
  },
  {
    id: 'LANDSLIDE',
    emoji: '⛰️',
    label: 'Landslide',
    color: '#a16207',
    bg: 'bg-yellow-700/15',
    border: 'border-yellow-700/40',
    keywords: ['mud', 'rockfall', 'debris', 'slope', 'collapse'],
    hints: 'Mud/rocks sliding? Road blocked? House damage?',
  },
];

// ── AI Processing steps ───────────────────────────────────────────────────
const AI_STEPS = [
  { label: 'Uploading image to server...', duration: 800 },
  { label: 'AI classifying disaster type...', duration: 1000 },
  { label: 'Verifying GPS coordinates...', duration: 600 },
  { label: 'Searching for similar incidents...', duration: 900 },
  { label: 'Computing priority score...', duration: 700 },
  { label: 'Generating incident report...', duration: 500 },
];

// ── Custom Leaflet marker ─────────────────────────────────────────────────
const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:40px;display:flex;align-items:flex-start;justify-content:center;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
  ">
    <div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:linear-gradient(135deg,#3b82f6,#06b6d4);
      transform:rotate(-45deg);border:3px solid white;
      box-shadow:0 2px 8px rgba(59,130,246,0.5);
    "></div>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

// ── Map Pin Selector ──────────────────────────────────────────────────────
function MapPinSelector({ location, onLocationChange, isDark }) {
  function LocationEvents() {
    useMapEvents({
      click(e) {
        onLocationChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={[location.latitude, location.longitude]}
      zoom={14}
      className="w-full h-full rounded-xl"
      zoomControl={true}
      style={{ background: 'var(--app-bg-primary)' }}
    >
      <TileLayer
        key={isDark ? 'dark' : 'light'}
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/${isDark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`}
      />
      <LocationEvents />
      {location && (
        <Marker position={[location.latitude, location.longitude]} icon={PIN_ICON} />
      )}
    </MapContainer>
  );
}

// ── Step Indicators ───────────────────────────────────────────────────────
function StepDot({ n, current, label }) {
  const done = n < current;
  const active = n === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        animate={{
          backgroundColor: done ? '#22c55e' : active ? '#3b82f6' : 'var(--app-bg-elevated)',
          borderColor: done ? '#22c55e' : active ? '#3b82f6' : '#334155',
          scale: active ? 1.15 : 1,
        }}
        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
      >
        {done ? <CheckCircle className="w-4 h-4" /> : n}
      </motion.div>
      <span className={`text-[9px] font-semibold ${active ? 'text-primary' : done ? 'text-low' : 'text-text-muted'}`}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function CitizenPortal({ onBack, isDark }) {
  const { user, token } = useAuth();
  const toast = useToast();

  /* ─ workflow step: 1=type, 2=location, 3=details, 4=processing, 5=done ─ */
  const [step, setStep] = useState(1);
  const [showAuth, setShowAuth] = useState(false);

  /* ─ form state ─ */
  const [selectedType, setSelectedType] = useState(null);
  const [location, setLocation] = useState({ latitude: 19.076, longitude: 72.8777 });
  const [gettingLoc, setGettingLoc] = useState(false);
  const [locSource, setLocSource] = useState('default'); // 'gps' | 'map' | 'default'
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);

  /* ─ processing / result ─ */
  const [aiStep, setAiStep] = useState(0);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  /* ─ my reports ─ */
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showMyReports, setShowMyReports] = useState(false);

  const fileRef = useRef();

  // Auto-detect GPS on mount
  useEffect(() => {
    autoDetectLocation();
  }, []);

  // Load my reports when auth available
  useEffect(() => {
    if (user && token && showMyReports) {
      loadMyReports();
    }
  }, [user, token, showMyReports]);

  const autoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocSource('gps');
        setGettingLoc(false);
      },
      () => {
        setLocSource('default');
        setGettingLoc(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  const loadMyReports = async () => {
    setLoadingReports(true);
    const data = await fetchMyReports(token);
    setMyReports(data);
    setLoadingReports(false);
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large — max 10 MB');
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!selectedType) { toast.error('Please select a disaster type'); return; }
    if (!description.trim()) { toast.error('Please describe what you see'); return; }

    setStep(4);
    setSubmitError('');
    setAiStep(0);

    // Animate AI steps
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setAiStep(i);
      if (i >= AI_STEPS.length - 1) clearInterval(interval);
    }, AI_STEPS[i]?.duration || 700);

    try {
      const report = await submitReport(
        {
          description,
          latitude: location.latitude,
          longitude: location.longitude,
          disasterTypeHint: selectedType,
          image,
        },
        token || null
      );
      clearInterval(interval);
      setAiStep(AI_STEPS.length);
      setTimeout(() => {
        setResult(report);
        setStep(5);
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setSubmitError(err.message);
      setStep(3);
      toast.error(`Submission failed: ${err.message}`);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setDescription('');
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setSubmitError('');
    setAiStep(0);
  };

  const selectedTypeConfig = DISASTER_TYPES.find((t) => t.id === selectedType);

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* ── Top Nav ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 h-14 bg-bg-surface/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary leading-none">
                ResQ<span className="text-primary">Map</span>
              </h1>
              <p className="text-[9px] text-text-muted uppercase tracking-wider">Citizen Portal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => { setShowMyReports(!showMyReports); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-bg-elevated text-xs font-medium text-text-secondary transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              My Reports
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-bg-elevated text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </motion.button>
          )}
        </div>
      </nav>

      {/* ── My Reports Drawer ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showMyReports && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-3 p-4 bg-bg-surface border border-border rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                My Submissions
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={loadMyReports} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted cursor-pointer">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowMyReports(false)} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {loadingReports ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : myReports.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">No reports submitted yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {myReports.map((r) => {
                  const dConfig = DISASTER_TYPES.find((d) => d.id === r.predicted_type);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated/50 border border-border">
                      <span className="text-lg">{dConfig?.emoji || '📍'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {r.predicted_type || 'Unknown'} Report
                          </span>
                          {r.incident_id && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-low/15 text-low">GROUPED</span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-muted">
                          {new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      {r.image_url && <ImageIcon className="w-3.5 h-3.5 text-text-muted shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {step <= 3 && (
        <div className="mx-4 mt-5 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-critical/15 border border-critical/30 mb-3">
              <div className="w-2 h-2 rounded-full bg-critical animate-pulse" />
              <span className="text-[10px] font-bold text-critical uppercase tracking-wider">
                Emergency Reporting Active
              </span>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1">
              Report a Disaster
            </h2>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Your report is instantly processed by AI and routed to emergency responders.
              No sign-in required.
            </p>
          </motion.div>

          {/* Step progress */}
          <div className="flex items-center justify-between mt-5 px-2">
            {[
              { n: 1, label: 'Type' },
              { n: 2, label: 'Location' },
              { n: 3, label: 'Details' },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center flex-1">
                <StepDot n={s.n} current={step} label={s.label} />
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-500 ${step > s.n ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">

          {/* ════ STEP 1: Disaster Type ════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="max-w-md mx-auto space-y-3"
            >
              <h3 className="text-sm font-bold text-text-primary mb-4 text-center">
                What type of disaster are you reporting?
              </h3>

              {DISASTER_TYPES.map((type) => (
                <motion.button
                  key={type.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedType === type.id
                      ? `${type.bg} ${type.border}`
                      : 'bg-bg-elevated/50 border-border hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                      style={{ backgroundColor: `${type.color}15` }}
                    >
                      {type.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-base font-bold"
                          style={{ color: selectedType === type.id ? type.color : '#f1f5f9' }}
                        >
                          {type.label}
                        </span>
                        {selectedType === type.id && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${type.color}20`, color: type.color }}
                          >
                            Selected ✓
                          </motion.span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{type.hints}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {type.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${type.color}15`, color: type.color }}
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!selectedType}
                onClick={() => setStep(2)}
                className="w-full py-3 mt-2 bg-gradient-to-r from-primary to-accent text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Set Location <ChevronRight className="w-4 h-4" />
              </motion.button>

              {!user && (
                <p className="text-center text-[10px] text-text-muted">
                  No sign-in required — reports are submitted anonymously.{' '}
                  <button onClick={() => setShowAuth(true)} className="text-primary underline cursor-pointer">
                    Sign in
                  </button>{' '}
                  to track your reports.
                </p>
              )}
            </motion.div>
          )}

          {/* ════ STEP 2: Location ════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="max-w-md mx-auto space-y-4"
            >
              <h3 className="text-sm font-bold text-text-primary text-center">
                Where is the disaster happening?
              </h3>

              {/* Location status */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                locSource === 'gps'
                  ? 'bg-low/10 border-low/30'
                  : locSource === 'map'
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-moderate/10 border-moderate/30'
              }`}>
                {gettingLoc ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Navigation className={`w-4 h-4 shrink-0 ${
                    locSource === 'gps' ? 'text-low' : locSource === 'map' ? 'text-primary' : 'text-moderate'
                  }`} />
                )}
                <div className="flex-1">
                  <p className={`text-xs font-semibold ${
                    locSource === 'gps' ? 'text-low' : locSource === 'map' ? 'text-primary' : 'text-moderate'
                  }`}>
                    {gettingLoc
                      ? 'Detecting your location...'
                      : locSource === 'gps'
                      ? 'GPS Location Detected'
                      : locSource === 'map'
                      ? 'Location Set via Map'
                      : 'Approximate Location (Mumbai)'}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">
                    {location.latitude.toFixed(5)}°N, {location.longitude.toFixed(5)}°E
                  </p>
                </div>
                <button
                  onClick={autoDetectLocation}
                  disabled={gettingLoc}
                  className="p-1.5 rounded-lg hover:bg-bg-elevated/50 text-text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gettingLoc ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Toggle map */}
              <button
                onClick={() => setMapOpen(!mapOpen)}
                className={`w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mapOpen
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-bg-elevated border-border text-text-secondary hover:border-border-light'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {mapOpen ? 'Hide Map' : 'Pin Exact Location on Map'}
              </button>

              {/* Map */}
              <AnimatePresence>
                {mapOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 280, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <div className="h-full relative">
                      <MapPinSelector
                        location={location}
                        isDark={isDark}
                        onLocationChange={(loc) => {
                          setLocation(loc);
                          setLocSource('map');
                        }}
                      />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-bg-surface/90 backdrop-blur px-3 py-1.5 rounded-full border border-border text-[10px] text-text-secondary shadow-lg pointer-events-none">
                        📍 Tap map to place pin
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(3)}
                  className="flex-2 flex-1 py-3 bg-gradient-to-r from-primary to-accent text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Next: Add Details <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 3: Details ════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="max-w-md mx-auto space-y-4"
            >
              <h3 className="text-sm font-bold text-text-primary text-center">
                Describe what you see
              </h3>

              {/* Selected type reminder */}
              {selectedTypeConfig && (
                <div
                  className={`flex items-center gap-2 p-2.5 rounded-xl ${selectedTypeConfig.bg} border ${selectedTypeConfig.border}`}
                >
                  <span className="text-xl">{selectedTypeConfig.emoji}</span>
                  <div>
                    <span className="text-xs font-bold" style={{ color: selectedTypeConfig.color }}>
                      {selectedTypeConfig.label} Incident
                    </span>
                    <p className="text-[10px] text-text-muted">{selectedTypeConfig.hints}</p>
                  </div>
                </div>
              )}

              {/* Image upload */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">
                  Photo Evidence <span className="font-normal normal-case text-text-muted">(required for AI classification)</span>
                </label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border">
                    <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover" />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-bg-surface/90 rounded-full text-critical hover:text-white hover:bg-critical transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 text-[10px] text-white/90 font-medium truncate">
                      📷 {image?.name}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    <Camera className="w-10 h-10 text-text-muted mx-auto mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-sm font-semibold text-text-secondary">Tap to capture / upload</p>
                    <p className="text-[10px] text-text-muted mt-1">PNG, JPG up to 10 MB · AI will analyse it</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImage}
                  className="hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">
                  Describe the Situation *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`E.g. "${selectedTypeConfig?.hints || 'Describe what is happening and who needs help'}"`}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
                />
                <p className="text-[10px] text-text-muted mt-1 text-right">{description.length} chars</p>
              </div>

              {/* AI hint */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent/10 border border-accent/20">
                <Brain className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  <span className="font-bold text-accent">AI Pipeline:</span> Your photo and description will be
                  analysed for disaster type, severity, and automatically grouped with nearby reports to
                  prioritise emergency response.
                </p>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-critical/10 border border-critical/30 text-xs text-critical">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!description.trim()}
                  className="flex-[2] py-3 bg-gradient-to-r from-primary to-accent text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Submit Report
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 4: AI Processing ════ */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto flex flex-col items-center justify-center py-12"
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center">
                  <Brain className="w-12 h-12 text-primary" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
                />
              </div>
              <h3 className="text-lg font-black text-text-primary mb-2">AI Processing</h3>
              <p className="text-xs text-text-muted mb-8 text-center">
                Your report is being analysed by our disaster AI engine
              </p>
              <div className="w-full max-w-xs space-y-3">
                {AI_STEPS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: i <= aiStep ? 1 : 0.25, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <motion.div
                      animate={{
                        backgroundColor: i < aiStep ? '#22c55e' : i === aiStep ? '#3b82f6' : 'var(--app-bg-elevated)',
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    >
                      {i < aiStep ? (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      ) : i === aiStep ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-border" />
                      )}
                    </motion.div>
                    <span className={`text-xs ${i <= aiStep ? 'text-text-primary' : 'text-text-muted'}`}>
                      {s.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════ STEP 5: Success ════ */}
          {step === 5 && result && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="max-w-md mx-auto flex flex-col items-center py-8 space-y-5"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-low/15 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-low" />
              </motion.div>

              <div className="text-center">
                <h3 className="text-xl font-black text-text-primary">Report Submitted!</h3>
                <p className="text-xs text-text-muted mt-1">
                  Emergency responders have been notified
                </p>
              </div>

              {/* Result card */}
              <div className="w-full p-4 rounded-2xl bg-bg-elevated border border-border space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedTypeConfig?.emoji}</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: selectedTypeConfig?.color }}
                  >
                    {result.predicted_type || selectedType} Alert
                  </span>
                </div>

                {[
                  {
                    label: 'Report ID',
                    value: `#${result.id?.slice(0, 8).toUpperCase()}`,
                    mono: true,
                  },
                  {
                    label: 'Location',
                    value: `${result.latitude?.toFixed(4)}°N, ${result.longitude?.toFixed(4)}°E`,
                    mono: true,
                  },
                  {
                    label: 'Grouped Into Event',
                    value: result.incident_id
                      ? `✅ Auto-clustered`
                      : '⏳ Pending review',
                  },
                  {
                    label: 'AI Classification',
                    value: result.image_confidence > 0
                      ? `${result.predicted_type} — ${(result.image_confidence * 100).toFixed(0)}% confidence`
                      : 'Processing (Phase 4)',
                  },
                  {
                    label: 'Status',
                    value: '🟢 Submitted & Active',
                  },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-xs text-text-muted">{label}</span>
                    <span className={`text-xs font-semibold text-text-primary text-right max-w-[55%] ${mono ? 'font-mono' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Safety tips */}
              <div className="w-full p-3 rounded-xl border border-moderate/30 bg-moderate/5 space-y-1.5">
                <p className="text-[10px] font-bold text-moderate uppercase tracking-wider">⚠ Stay Safe</p>
                {[
                  'Move to higher ground if flooding',
                  'Evacuate the building if on fire',
                  'Stay away from unstable slopes',
                ].map((tip) => (
                  <div key={tip} className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <ChevronRight className="w-3 h-3 text-moderate shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-xl bg-bg-elevated border border-border text-sm font-bold text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  Report Another
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-bold cursor-pointer shadow-lg shadow-primary/25"
                >
                  View Live Map
                </button>
              </div>

              {!user && (
                <p className="text-[10px] text-text-muted text-center">
                  <button onClick={() => setShowAuth(true)} className="text-primary underline cursor-pointer">
                    Sign in
                  </button>{' '}
                  to track this report and get status updates.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emergency contacts footer */}
      {step <= 3 && (
        <div className="mx-4 mb-6 p-3 rounded-2xl bg-bg-surface border border-border">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 text-center">
            Emergency Contacts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Police', num: '100', color: '#3b82f6' },
              { label: 'Fire', num: '101', color: '#ef4444' },
              { label: 'Ambulance', num: '108', color: '#22c55e' },
            ].map((c) => (
              <a
                key={c.label}
                href={`tel:${c.num}`}
                className="flex flex-col items-center p-2 rounded-xl border border-border hover:bg-bg-elevated transition-colors cursor-pointer"
                style={{ borderColor: `${c.color}30` }}
              >
                <span className="text-lg font-black" style={{ color: c.color }}>{c.num}</span>
                <span className="text-[9px] text-text-muted">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && <AuthModal key="auth" onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
}
