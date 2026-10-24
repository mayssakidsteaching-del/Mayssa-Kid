import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi, CheckCircle2, X } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsDismissed(false);
    } else if (wasOffline) {
      setShowReconnectedToast(true);
      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (showReconnectedToast) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-[#0d1f16]/95 px-4 py-2.5 text-xs font-mono text-emerald-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <div>
          <span className="font-semibold text-white">Back Online</span>
          <span className="text-emerald-400/80 ml-1.5">— Live Gemini models and search restored.</span>
        </div>
      </div>
    );
  }

  if (isOnline || isDismissed) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex max-w-md items-center gap-3 rounded-xl border border-amber-500/30 bg-[#19150c]/95 px-4 py-2.5 text-xs font-mono text-amber-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        <span className="absolute h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
        <span className="relative h-2 w-2 rounded-full bg-amber-500" />
      </div>
      <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[#fef08a]">Offline Mode Active</div>
        <div className="text-[11px] text-neutral-300">
          Running from local cache. Inquiries & documents remain fully accessible.
        </div>
      </div>
      <button
        onClick={() => setIsDismissed(true)}
        className="ml-1 rounded-md p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Dismiss indicator"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
