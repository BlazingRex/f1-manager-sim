import { useEffect, useState } from 'react';

export default function RadioAlert({ alert }) {
  const [visible, setVisible] = useState(false);
  const alertKey = alert?.key;
  const alertTs = alert?.ts;
  const hasAlert = Boolean(alert);

  useEffect(() => {
    if (!hasAlert) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [hasAlert, alertKey, alertTs]);

  if (!alert || !visible) return null;

  return (
    <div className="radioAlert" role="status" aria-live="polite">
      <div className="radioAlertHeader">Radio</div>
      <div className="radioAlertMessage">{alert.message}</div>
    </div>
  );
}
