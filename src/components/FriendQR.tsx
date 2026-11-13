import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, CameraOff, Check, QrCode, ScanLine } from 'lucide-react';
import QRCode from 'qrcode';
import { acceptInvite, createInvite, inviteFromText, type InviteResult } from '../online/account';
import { useT } from '../store';
import { spring } from '../motion/springs';
import { Sheet } from './Sheet';
import { STROKE } from './icons';
import { cue } from '../feedback';

/** Your QR code: a friend scans it and you're friends straight away. */
export function MyQRSheet({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  const t = useT();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let refresh: ReturnType<typeof setTimeout>;
    let tick: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const { url, expiresAt } = await createInvite();
        const markup = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d2430', light: '#ffffff' } });
        if (!alive) return;
        setSvg(markup);
        setError(false);
        clearInterval(tick);
        tick = setInterval(() => setLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000))), 1000);
        // A fresh code shortly before this one expires.
        refresh = setTimeout(load, Math.max(10_000, expiresAt - Date.now() - 15_000));
      } catch {
        if (alive) setError(true);
      }
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(refresh);
      clearInterval(tick);
    };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label={t.myQr}>
      <div className="qr-sheet">
        <h2 className="title">{name}</h2>
        <p className="caption">{t.myQrHelp}</p>
        <motion.div className="qr-box" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.flick}>
          {svg ? <div className="qr-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : <QrCode size={64} strokeWidth={1.2} opacity={0.3} />}
        </motion.div>
        {error ? <p className="caption form-msg is-error">{t.qrError}</p> : svg && <p className="caption">{t.qrRefresh(Math.ceil(left / 60))}</p>}
      </div>
    </Sheet>
  );
}

type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Scan a friend's QR code with the camera. */
export function ScanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'starting' | 'scanning' | 'denied' | 'working' | InviteResult | 'notours'>('starting');

  useEffect(() => {
    if (!open) return;
    setState('starting');
    let stream: MediaStream | null = null;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setState('denied');
        return;
      }
      if (stop || !video.current) return stream.getTracks().forEach((tr) => tr.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      setState('scanning');

      // The browser's own QR reader where there is one (Android Chrome); jsQR everywhere else (iPhone).
      const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;

      const scan = async () => {
        if (stop || !video.current) return;
        const v = video.current;
        let text: string | null = null;
        if (v.videoWidth) {
          if (detector) {
            text = (await detector.detect(v).catch(() => []))[0]?.rawValue ?? null;
          } else if (jsQR && ctx) {
            const w = 480;
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
          }
        }
        if (text) {
          const token = inviteFromText(text);
          if (!token) {
            setState('notours');
          } else {
            stop = true;
            setState('working');
            const result = await acceptInvite(token).catch(() => 'expired' as const);
            cue(result === 'accepted' ? 'correct' : 'wrong');
            setState(result);
            stream?.getTracks().forEach((tr) => tr.stop());
            return;
          }
        }
        timer = setTimeout(scan, 200);
      };
      void scan();
    })();

    return () => {
      stop = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [open]);

  const done = state === 'accepted' || state === 'already_friends';
  const message: Partial<Record<typeof state, string>> = {
    denied: t.cameraDenied,
    accepted: t.scanAccepted,
    already_friends: t.scanAlready,
    expired: t.scanExpired,
    self: t.scanSelf,
    signed_out: t.scanSignIn,
    notours: t.scanNotOurs,
  };

  return (
    <Sheet open={open} onClose={onClose} label={t.scanQr}>
      <div className="qr-sheet">
        <h2 className="title">{t.scanQr}</h2>
        <p className="caption">{t.scanHelp}</p>
        <div className={`scan-box ${done ? 'is-done' : ''}`}>
          {state === 'denied' ? (
            <CameraOff size={48} strokeWidth={1.4} opacity={0.4} />
          ) : done ? (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={spring.flick} className="scan-ok">
              <Check size={56} strokeWidth={2.4} />
            </motion.div>
          ) : (
            <>
              <video ref={video} playsInline muted />
              <ScanLine className="scan-frame" size={180} strokeWidth={0.6} />
              {state === 'starting' && <Camera className="scan-wait" size={40} strokeWidth={STROKE} />}
            </>
          )}
        </div>
        {message[state] && <p className={`caption form-msg ${done ? 'is-info' : 'is-error'}`}>{message[state]}</p>}
      </div>
    </Sheet>
  );
}
