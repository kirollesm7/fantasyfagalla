import { useEffect, useState, useCallback } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Wraps the browser's native "beforeinstallprompt" flow (Chrome/Edge/Android)
// and falls back to manual instructions on iOS Safari, which never fires
// that event and only supports installing via the Share sheet.
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onBeforeInstall = (e) => {
      console.log('[PWA] beforeinstallprompt fired — app is installable');
      e.preventDefault();
      setDeferredEvent(e);
    };
    const onInstalled = () => {
      console.log('[PWA] appinstalled event fired');
      setInstalled(true);
      setDeferredEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    console.log('[PWA] listening for beforeinstallprompt. standalone already?', isStandalone());
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) {
      console.warn('[PWA] promptInstall called but no deferred event is available yet');
      return null;
    }
    deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    console.log('[PWA] user choice:', choice.outcome);
    setDeferredEvent(null);
    return choice.outcome; // 'accepted' | 'dismissed'
  }, [deferredEvent]);

  return {
    installed,
    canPromptNatively: !!deferredEvent,
    isIOS: isIOS(),
    // "available" = worth showing an install button at all
    available: !installed && (!!deferredEvent || isIOS()),
    promptInstall,
  };
}
