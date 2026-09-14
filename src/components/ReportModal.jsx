import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, MapPin, FileText, Send, CheckCircle, Loader2,
  AlertTriangle, Brain, Image, XCircle, Lock,
} from 'lucide-react';
import { submitReport } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';

const AI_STEPS = [
  'Uploading image to server...',
  'AI classifying disaster type...',
  'Verifying location data...',
  'Matching with existing incidents...',
  'Computing priority score...',
];

export default function ReportModal({ onClose, onSubmitted }) {
  const { user, token } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1); // 1=form, 2=processing, 3=done
  const [formData, setFormData] = useState({ description: '', image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [gettingLoc, setGettingLoc] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [aiStep, setAiStep] = useState(0);
  const fileRef = useRef();

  // Detect geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      // Fallback to Mumbai coords
      setLocation({ latitude: 19.076, longitude: 72.8777 });
      return;
    }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGettingLoc(false);
      },
      () => {
        // Fallback
        setLocation({ latitude: 19.076, longitude: 72.8777 });
        setLocError('Could not get GPS — using Mumbai fallback');
        setGettingLoc(false);
      },
      { timeout: 8000 }
    );
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10 MB)');
      return;
    }
    setFormData((d) => ({ ...d, image: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData((d) => ({ ...d, image: null }));
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !token) {
      toast.error('Please sign in to submit a report');
      return;
    }
    if (!location) {
      toast.error('Location not available');
      return;
    }

    setStep(2);
    setSubmitError('');

    // Animate AI steps
    let i = 0;
    const stepInterval = setInterval(() => {
      i += 1;
      setAiStep(i);
      if (i >= AI_STEPS.length - 1) clearInterval(stepInterval);
    }, 700);

    try {
      const report = await submitReport(
        {
          description: formData.description,
          latitude: location.latitude,
          longitude: location.longitude,
          image: formData.image,
        },
        token
      );
      clearInterval(stepInterval);
      setAiStep(AI_STEPS.length);
      setTimeout(() => {
        setResult(report);
        setStep(3);
        if (onSubmitted) onSubmitted();
      }, 500);
    } catch (err) {
      clearInterval(stepInterval);
      setSubmitError(err.message);
      setStep(1);
      toast.error(`Failed to submit: ${err.message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl mx-4"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Report Disaster</h2>
              <p className="text-[10px] text-text-muted">Step {Math.min(step, 3)} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-primary' : 'bg-bg-elevated'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Form ─────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Auth check */}
                {!user && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-moderate/10 border border-moderate/30">
                    <Lock className="w-4 h-4 text-moderate shrink-0" />
                    <p className="text-[11px] text-text-secondary">
                      You must <span className="text-primary font-bold">sign in</span> to submit a report. You can still fill the form.
                    </p>
                  </div>
                )}

                {/* Photo upload */}
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">
                    Upload Photo <span className="text-text-muted font-normal normal-case">(optional)</span>
                  </label>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-bg-surface/90 rounded-full text-critical hover:bg-bg-surface cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 text-[10px] text-white font-medium">
                        {formData.image?.name}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer group"
                    >
                      <Camera className="w-8 h-8 text-text-muted mx-auto mb-2 group-hover:text-primary transition-colors" />
                      <p className="text-xs text-text-secondary">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-text-muted mt-1">PNG, JPG up to 10 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">
                    Describe the Incident
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is happening? Are people in danger? How severe?"
                    rows={3}
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* Location */}
                <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${
                  gettingLoc
                    ? 'bg-bg-elevated border-border'
                    : location
                    ? 'bg-low/10 border-low/30'
                    : 'bg-critical/10 border-critical/30'
                }`}>
                  <MapPin className={`w-4 h-4 shrink-0 ${location ? 'text-low' : 'text-critical'}`} />
                  <div>
                    {gettingLoc ? (
                      <p className="text-[10px] text-text-muted">Getting your location...</p>
                    ) : location ? (
                      <>
                        <p className="text-[10px] font-semibold text-low">Location Detected</p>
                        <p className="text-[10px] text-text-muted font-mono">
                          {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                          {locError && ' (fallback)'}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-critical">Location unavailable</p>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-critical/10 border border-critical/30 text-[11px] text-critical">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    {submitError}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!location || !user}
                  className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {!user ? 'Sign In to Submit' : 'Submit Report'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 2: AI Processing ─────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">AI Processing...</h3>
                <div className="space-y-2 max-w-xs mx-auto">
                  {AI_STEPS.map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: i <= aiStep ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 text-xs text-text-secondary text-left"
                    >
                      {i <= aiStep ? (
                        <CheckCircle className="w-3.5 h-3.5 text-low shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-border shrink-0" />
                      )}
                      {item}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Success ───────────────────────────────── */}
            {step === 3 && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-low/15 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-low" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Report Submitted!</h3>
                <div className="p-3 rounded-xl bg-bg-elevated border border-border text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Report ID</span>
                    <span className="font-mono text-xs text-text-secondary">{result.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Location</span>
                    <span className="font-semibold text-text-primary">
                      {result.latitude?.toFixed(4)}, {result.longitude?.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">AI Classification</span>
                    <span className="font-bold text-primary">
                      {result.predicted_type
                        ? `${result.predicted_type} — ${(result.image_confidence * 100).toFixed(0)}%`
                        : 'Pending analysis'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Status</span>
                    <span className="font-semibold text-low">Submitted ✓</span>
                  </div>
                </div>
                <p className="text-[11px] text-text-muted">
                  Your report has been submitted. Operators will review and act on it shortly.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-bg-elevated text-text-primary text-xs font-bold rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
