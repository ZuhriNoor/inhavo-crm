import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Download, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PWAUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('Service Worker registered successfully');
        // Periodically check for updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const closeToast = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh && !offlineReady && !showInstallBanner) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-xl shadow-2xl p-4 transition-all duration-300 transform translate-y-0">
      {needRefresh ? (
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-slate-100">Update Available</h4>
            <p className="text-xs text-slate-300 mt-0.5">A new version of Inhavo CRM is available.</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Reload & Update
              </button>
              <button
                onClick={closeToast}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : showInstallBanner ? (
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-slate-100">Install Inhavo CRM</h4>
            <p className="text-xs text-slate-300 mt-0.5">Install app for fast, single-click access on your desktop or mobile device.</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Install App
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      ) : offlineReady ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-300">Inhavo CRM ready to work offline.</p>
          <button
            onClick={closeToast}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
