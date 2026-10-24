import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'inline';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={install}
          className="flex w-full items-center gap-2.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-2 text-xs font-mono text-[#f3cf65] hover:bg-[#d4af37]/20 transition-all shadow-sm"
          title="Install Berno to your desktop or home screen for full offline operation"
        >
          <Download className="h-3.5 w-3.5 text-[#d4af37]" />
          <span>Install App (Offline Ready)</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 px-2.5 py-1 text-xs font-mono text-[#f3cf65] transition-all hover:bg-[#d4af37]/25 hover:border-[#d4af37]/70 shadow-sm"
        title="Install Berno for instant offline access directly from your desktop or phone"
      >
        <Download className="h-3.5 w-3.5 text-[#d4af37]" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'sidebar'
              ? 'flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-neutral-300 hover:bg-white/10'
              : 'flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:border-[#d4af37]/40 hover:text-white transition-all'
          }
          title="Install Berno on iPhone / iPad"
        >
          <Download className="h-3.5 w-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/30 bg-[#12151e] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40">
                    <Download className="h-4 w-4 text-[#d4af37]" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-100 font-serif">
                    Install Berno on iOS
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-md p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-neutral-300">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/20 font-mono text-[11px] font-bold text-[#f3cf65]">
                    1
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Tap the Safari</span>
                    <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">
                      <Share className="h-3 w-3" /> Share
                    </span>
                    <span>button in the toolbar.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/20 font-mono text-[11px] font-bold text-[#f3cf65]">
                    2
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Scroll down and select</span>
                    <span className="inline-flex items-center gap-1 rounded bg-[#d4af37]/20 px-1.5 py-0.5 text-[#f3cf65] font-semibold border border-[#d4af37]/30">
                      <PlusSquare className="h-3 w-3" /> Add to Home Screen
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/20 font-mono text-[11px] font-bold text-[#f3cf65]">
                    3
                  </span>
                  <span>
                    Berno will be available directly from your home screen with offline capability!
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
