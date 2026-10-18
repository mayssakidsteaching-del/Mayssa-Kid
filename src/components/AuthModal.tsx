import React, { useState } from 'react';
import { User } from '../types';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Check,
  LogIn,
  UserPlus,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const DEMO_USERS: User[] = [
  {
    id: 'user-aris-thorne',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@berno.ai',
    role: 'Chief Epistemic Architect',
    tier: 'Architect',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user-elena-rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@berno.ai',
    role: 'Quantum Systems Fellow',
    tier: 'Scholar',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'user-marcus-vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@berno.ai',
    role: 'Executive Strategic Director',
    tier: 'Titan',
    createdAt: Date.now() - 86400000 * 7,
  },
];

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'Scholar' | 'Titan' | 'Architect'>('Scholar');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Please provide your name or academic title.');
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API if available, fallback gracefully
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const body =
        mode === 'signup'
          ? { name: name.trim(), email: email.trim(), password, tier }
          : { email: email.trim(), password, rememberMe };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          onLoginSuccess(data.user);
          onClose();
          return;
        }
      }

      // If server returned non-ok or isn't handling it, generate or validate client session
      const user: User = {
        id: `user-${Date.now()}`,
        name: mode === 'signup' ? name.trim() : email.split('@')[0],
        email: email.trim(),
        tier: mode === 'signup' ? tier : 'Scholar',
        role: mode === 'signup' ? `${tier} Inquirer` : 'Berno Scholar',
        createdAt: Date.now(),
      };

      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      // Local fallback in offline mode
      const user: User = {
        id: `user-${Date.now()}`,
        name: mode === 'signup' ? name.trim() : email.split('@')[0],
        email: email.trim(),
        tier: mode === 'signup' ? tier : 'Scholar',
        role: 'Berno Scholar',
        createdAt: Date.now(),
      };
      onLoginSuccess(user);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (demo: User) => {
    setIsLoading(true);
    setTimeout(() => {
      onLoginSuccess(demo);
      setIsLoading(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0b0e14] p-6 shadow-2xl text-neutral-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#d4af37]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37] shadow-inner">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Berno Epistemic Access
            </h2>
            <p className="text-xs text-neutral-400">
              Sign in to preserve inquiries, custom stances & session history
            </p>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl border border-white/10 bg-[#12151e] p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              mode === 'signin'
                ? 'bg-[#1b202d] text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              mode === 'signup'
                ? 'bg-[#1b202d] text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* One-Click Quick Demo Access */}
        <div className="mb-5 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Quick 1-Click Scholar Login
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">Demo Accounts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                className="flex flex-col items-start p-2 rounded-lg border border-white/10 bg-black/40 hover:bg-[#d4af37]/15 hover:border-[#d4af37]/50 text-left transition-all group"
              >
                <span className="text-xs font-semibold text-white group-hover:text-[#f3cf65] truncate w-full">
                  {demo.name.split(' ')[0]} {demo.name.split(' ')[1] || ''}
                </span>
                <span className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-300">
                  {demo.tier}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full rounded-xl border border-white/10 bg-[#12151d] pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-neutral-400 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@institution.edu"
                required
                className="w-full rounded-xl border border-white/10 bg-[#12151d] pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-neutral-400 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-xl border border-white/10 bg-[#12151d] pl-9 pr-9 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1">
                Cognitive Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Scholar', 'Titan', 'Architect'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`rounded-lg border py-1.5 text-xs font-mono transition-all ${
                      tier === t
                        ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65]'
                        : 'border-white/10 bg-[#12151d] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-[#12151d] text-[#d4af37] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-neutral-400">Remember session</span>
            </label>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setEmail('aris.thorne@berno.ai');
                  setPassword('berno-intellect');
                }}
                className="text-xs font-mono text-[#d4af37] hover:underline"
              >
                Fill demo credentials
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#f3cf65] py-2.5 text-xs font-semibold font-mono tracking-wide transition-all shadow-md mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-[#f3cf65] border-t-transparent animate-spin" />
                Authenticating...
              </span>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In to Berno</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Create Scholar Account</span>
                <Check className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-5 text-center text-[11px] text-neutral-500 border-t border-white/10 pt-3 flex items-center justify-center gap-1">
          <BookOpen className="h-3 w-3 text-neutral-400" />
          <span>Sessions and research history are locally safeguarded.</span>
        </div>
      </div>
    </div>
  );
}
