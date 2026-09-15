import { useState, useCallback } from 'react';
import { requestNotificationToken } from '../lib/firebase';
import { sbSaveNotificationToken } from '../lib/db';

export function useNotifications(username) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [busy, setBusy] = useState(false);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const token = await requestNotificationToken();
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
      if (!token) return { ok: false };
      if (username) await sbSaveNotificationToken(username, token);
      return { ok: true };
    } catch (e) {
      console.error('enable notifications failed', e);
      return { ok: false, error: e };
    } finally {
      setBusy(false);
    }
  }, [username]);

  return { permission, busy, enable };
}
