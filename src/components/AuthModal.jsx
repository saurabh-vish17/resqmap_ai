import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, Mail, Lock, User, Phone, Eye, EyeOff,
  LogIn, UserPlus, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';

const ROLE_OPTIONS = [
  { value: 'citizen', label: '🧑 Citizen', desc: 'Report disasters, view incidents' },
  { value: 'operator', label: '🛡️ Operator', desc: 'Dispatch resources, manage incidents' },
];

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Register state
  const [regForm, setRegForm] = useState({
    name: '', email: '', password: '', role: 'citizen', contact: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      toast.success(`Welcome back, ${user.name}! 👋`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const user = await register(regForm.name, regForm.email, regForm.password, regForm.role);
      toast.success(`Account created! Welcome, ${user.name} 🎉`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                ResQ<span className="text-primary">Map</span> <span className="text-accent text-base">AI</span>
              </h2>
              <p className="text-sm text-text-muted">Command Centre Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'login', icon: LogIn, label: 'Sign In' },
            { id: 'register', icon: UserPlus, label: 'Register' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-lg font-semibold transition-all cursor-pointer border-b-2 ${
                tab === t.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <p className="text-lg text-text-muted mb-4">
                  Sign in to dispatch resources and manage incidents.
                </p>

                {/* Demo credentials hint */}
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/25 text-base text-text-secondary space-y-1">
                  <div><span className="text-accent font-bold">Operator: </span>operator@resqmap.ai / operator123</div>
                  <div><span className="text-accent font-bold">Admin: </span>admin@resqmap.ai / admin123</div>
                </div>

                <div>
                  <label className="text-base font-bold text-text-muted uppercase tracking-wider mb-1 block">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full pl-14 pr-3 py-3 bg-bg-elevated border border-border rounded-lg text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-text-muted uppercase tracking-wider mb-1 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-14 pr-14 py-3 bg-bg-elevated border border-border rounded-lg text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-critical/10 border border-critical/30 text-[15px] text-critical">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-1 bg-gradient-to-r from-primary to-accent text-white text-base font-bold rounded-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><LogIn className="w-3.5 h-3.5" /> Sign In</>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <p className="text-lg text-text-muted mb-2">Create your account to start reporting.</p>

                <div>
                  <label className="text-base font-bold text-text-muted uppercase tracking-wider mb-1 block">Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      required
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="Full name"
                      className="w-full pl-14 pr-3 py-3 bg-bg-elevated border border-border rounded-lg text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-text-muted uppercase tracking-wider mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full pl-14 pr-3 py-3 bg-bg-elevated border border-border rounded-lg text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-text-muted uppercase tracking-wider mb-1 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="w-full pl-14 pr-14 py-3 bg-bg-elevated border border-border rounded-lg text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="text-base font-bold text-text-muted uppercase tracking-wider mb-1.5 block">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRegForm({ ...regForm, role: r.value })}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          regForm.role === r.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-bg-elevated text-text-muted hover:border-border-light'
                        }`}
                      >
                        <div className="text-lg font-bold">{r.label}</div>
                        <div className="text-base opacity-70 mt-0.5">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-critical/10 border border-critical/30 text-[15px] text-critical">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 bg-gradient-to-r from-primary to-accent text-white text-lg font-bold rounded-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Create Account</>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
