import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { FiAlertTriangle, FiCamera, FiCheckCircle, FiRefreshCw, FiVolume2, FiVolumeX, FiWifiOff, FiXCircle, FiZap, FiZapOff } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, Input, Select } from '../../components/ui';
import { adminService } from '../../services/adminService';
import './content/scanner.css';

const SCAN_INTERVAL_MS = 140;
const SAME_CODE_COOLDOWN_MS = 4000;

const REASONS = {
  MALFORMED: 'This is not a CardHub ticket code.',
  NOT_FOUND: 'No ticket with this code exists.',
  NOT_PAID: 'This ticket’s order was never paid.',
  WRONG_EVENT: 'This ticket is for a different event.',
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Reads one video frame: native BarcodeDetector when available, otherwise jsQR on a downscaled canvas. */
async function decodeFrame(video, canvas, detector) {
  if (!video || video.readyState < 2 || !video.videoWidth) return null;
  if (detector) {
    try {
      return (await detector.detect(video))[0]?.rawValue || null;
    } catch {
      return null;
    }
  }
  const scale = Math.min(1, 720 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data || null;
}

/** Short confirmation tones (Web Audio, no files). */
function beep(kind) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = beep.ctx || (beep.ctx = new Ctx());
    const tones = kind === 'ok' ? [[880, 0], [1320, 0.12]] : [[220, 0], [180, 0.18]];
    tones.forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'ok' ? 'sine' : 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.17);
    });
  } catch {
    /* sound is optional */
  }
}

/**
 * Admin → Scan & verify tickets at the door. The camera only reads the QR;
 * the server decides (POST /admin/tickets/check-in, atomic), so a decoded
 * code is never treated as valid on its own and a network failure is shown
 * as such, never as "valid".
 */
export function AdminScanPage() {
  const [params, setParams] = useSearchParams();
  const eventId = params.get('eventId') || '';
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const pausedRef = useRef(false);
  const lastCodeRef = useRef({ value: '', at: 0 });
  const timerRef = useRef(0);
  const runningRef = useRef(false);
  const submitRef = useRef(null);
  const resultRef = useRef(null);

  const [camera, setCamera] = useState('idle'); // idle | starting | live | denied | unavailable | error | paused
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [sound, setSound] = useState(true);
  const [result, setResult] = useState(null); // { kind, data, code }
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [session, setSession] = useState({ accepted: 0, rejected: 0 });

  // ---- events + live count
  useEffect(() => {
    adminService
      .listTicketEvents({ scope: 'ticketing', limit: 50 })
      .then((res) => setEvents(res.data.data.events))
      .catch(() => setEvents([]));
  }, []);

  const refreshStats = useCallback(() => {
    if (!eventId) return;
    adminService
      .checkInStats(eventId)
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null));
  }, [eventId]);
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);
  const shownStats = eventId ? stats : null;

  // ---- camera
  const stopCamera = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorch({ supported: false, on: false });
  }, []);

  const submit = useCallback(
    async (code) => {
      pausedRef.current = true;
      setBusy(true);
      try {
        const res = await adminService.checkInTicket({ code, eventId: eventId || undefined });
        const data = res.data.data;
        const kind = data.result;
        setResult({ kind, data, code });
        if (sound) beep(kind === 'ACCEPTED' ? 'ok' : 'bad');
        navigator.vibrate?.(kind === 'ACCEPTED' ? 120 : [80, 60, 80, 60, 80]);
        setSession((s) => (kind === 'ACCEPTED' ? { ...s, accepted: s.accepted + 1 } : { ...s, rejected: s.rejected + 1 }));
        if (kind === 'ACCEPTED') refreshStats();
      } catch (error) {
        // No verdict from the server: never treat as valid.
        const status = error.response?.status;
        setResult({ kind: 'NETWORK', code, status, message: status === 401 || status === 403 ? 'Your admin session has ended. Sign in again.' : status === 429 ? 'Too many scans at once. Wait a moment.' : 'Could not reach CardHub. The ticket was NOT verified.' });
        if (sound) beep('bad');
      } finally {
        setBusy(false);
      }
    },
    [eventId, sound, refreshStats]
  );

  // The frame loop is long-lived; it always calls the latest submit (current event filter and sound).
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  const startCamera = useCallback(
    async (preferredId = deviceId) => {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('unavailable');
        return;
      }
      setCamera('starting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: preferredId ? { deviceId: { exact: preferredId } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        setTorch({ supported: Boolean(caps.torch), on: false });
        const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
        setDevices(list);
        setDeviceId(track.getSettings?.().deviceId || preferredId || '');
        if (!detectorRef.current && 'BarcodeDetector' in window) {
          try {
            const formats = await window.BarcodeDetector.getSupportedFormats();
            if (formats.includes('qr_code')) detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
          } catch {
            detectorRef.current = null;
          }
        }
        pausedRef.current = Boolean(result);
        setCamera('live');
        runningRef.current = true;
        // One frame every SCAN_INTERVAL_MS until stopCamera() clears runningRef.
        const loop = async () => {
          if (!runningRef.current) return;
          if (!pausedRef.current) {
            const value = await decodeFrame(video, canvasRef.current, detectorRef.current);
            const now = Date.now();
            const repeat = value === lastCodeRef.current.value && now - lastCodeRef.current.at < SAME_CODE_COOLDOWN_MS;
            if (value && !repeat && !pausedRef.current && runningRef.current) {
              lastCodeRef.current = { value, at: now };
              submitRef.current?.(value);
            }
          }
          if (runningRef.current) timerRef.current = setTimeout(loop, SCAN_INTERVAL_MS);
        };
        loop();
      } catch (error) {
        stopCamera();
        setCamera(error.name === 'NotAllowedError' || error.name === 'SecurityError' ? 'denied' : error.name === 'NotFoundError' ? 'unavailable' : 'error');
      }
    },
    [deviceId, result, stopCamera]
  );

  // On phones the verdict sits below the camera: bring it into view.
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [result]);

  // Release the camera when leaving the page; pause it while the tab is hidden.
  useEffect(() => () => stopCamera(), [stopCamera]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && streamRef.current) {
        stopCamera();
        setCamera('paused');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stopCamera]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch.on }] });
      setTorch((t) => ({ ...t, on: !t.on }));
    } catch {
      setTorch({ supported: false, on: false });
    }
  }

  function switchCamera() {
    if (devices.length < 2) return;
    const index = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(index + 1) % devices.length].deviceId;
    startCamera(next);
  }

  function scanNext() {
    setResult(null);
    setManual('');
    lastCodeRef.current = { value: '', at: 0 };
    pausedRef.current = false;
  }

  function onManualSubmit(e) {
    e.preventDefault();
    if (!manual.trim() || busy) return;
    submit(manual.trim());
  }

  const selectedEvent = events.find((ev) => String(ev.id) === String(eventId));
  const tone = !result ? '' : result.kind === 'ACCEPTED' ? 'ok' : result.kind === 'ALREADY_USED' ? 'warn' : result.kind === 'NETWORK' ? 'net' : 'bad';

  return (
    <div className="ch-admin-page ch-scan">
      <Seo title="Admin — Scan & verify" noIndex />
      <PageHeader eyebrow="Event entrance" title="Scan & verify tickets" description="Point the camera at a ticket QR. The server confirms every ticket and admits it only once." />

      <div className="ch-scan__bar">
        <Select
          aria-label="Event"
          value={eventId}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('eventId', e.target.value);
            else next.delete('eventId');
            setParams(next, { replace: true });
          }}
          options={[{ value: '', label: 'Any event' }, ...events.map((ev) => ({ value: String(ev.id), label: ev.title }))]}
        />
        {shownStats && (
          <p className="ch-scan__count">
            <strong>{shownStats.checkedIn}</strong> / {shownStats.total} checked in
          </p>
        )}
      </div>

      <div className="ch-scan__layout">
        <section className="ch-scan__camera" aria-label="Camera">
          <div className={`ch-scan__viewport ${camera === 'live' ? 'ch-scan__viewport--live' : ''}`}>
            <video ref={videoRef} className="ch-scan__video" muted playsInline aria-hidden="true" />
            <canvas ref={canvasRef} className="ch-visually-hidden" aria-hidden="true" />
            {camera === 'live' && !result && <span className="ch-scan__frame" aria-hidden="true" />}
            {camera !== 'live' && (
              <div className="ch-scan__placeholder">
                <FiCamera aria-hidden="true" />
                <p>
                  {camera === 'starting' && 'Starting camera…'}
                  {camera === 'idle' && 'Camera is off.'}
                  {camera === 'paused' && 'Camera paused while the app was in the background.'}
                  {camera === 'denied' && 'Camera permission was denied. Allow camera access in the browser settings, or enter codes below.'}
                  {camera === 'unavailable' && 'No camera available on this device. Enter codes below.'}
                  {camera === 'error' && 'The camera could not start. Try again or enter codes below.'}
                </p>
                {camera !== 'starting' && camera !== 'unavailable' && (
                  <Button variant="primary" leftIcon={<FiCamera aria-hidden="true" />} onClick={() => startCamera()}>
                    {camera === 'idle' ? 'Start scanning' : 'Try again'}
                  </Button>
                )}
              </div>
            )}
            {busy && <div className="ch-scan__busy">Checking…</div>}
          </div>

          {camera === 'live' && (
            <div className="ch-scan__controls">
              {devices.length > 1 && (
                <Button variant="secondary" size="sm" leftIcon={<FiRefreshCw aria-hidden="true" />} onClick={switchCamera}>
                  Switch camera
                </Button>
              )}
              {torch.supported && (
                <Button variant="secondary" size="sm" leftIcon={torch.on ? <FiZapOff aria-hidden="true" /> : <FiZap aria-hidden="true" />} onClick={toggleTorch}>
                  {torch.on ? 'Torch off' : 'Torch on'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { stopCamera(); setCamera('idle'); }}>
                Stop camera
              </Button>
            </div>
          )}

          <form className="ch-scan__manual" onSubmit={onManualSubmit}>
            <Input label="Or type the ticket ID" placeholder="CH-XXXXXXXX" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="characters" autoComplete="off" disabled={busy} />
            <Button type="submit" variant="brand" isLoading={busy} disabled={!manual.trim()}>
              Verify
            </Button>
          </form>
        </section>

        <section ref={resultRef} className={`ch-scan__result ${tone ? `ch-scan__result--${tone}` : ''}`} aria-live="assertive" aria-atomic="true">
          {!result && (
            <div className="ch-scan__waiting">
              <p className="ch-scan__waiting-title">Ready</p>
              <p>Scan a ticket QR{selectedEvent ? ` for ${selectedEvent.title}` : ''}.</p>
              <p className="ch-scan__session">
                This session: {session.accepted} admitted · {session.rejected} refused
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="ch-scan__verdict">
                {tone === 'ok' && <FiCheckCircle aria-hidden="true" />}
                {tone === 'warn' && <FiAlertTriangle aria-hidden="true" />}
                {tone === 'bad' && <FiXCircle aria-hidden="true" />}
                {tone === 'net' && <FiWifiOff aria-hidden="true" />}
                <div>
                  <p className="ch-scan__verdict-title">
                    {result.kind === 'ACCEPTED' && 'VALID — ADMIT'}
                    {result.kind === 'ALREADY_USED' && 'ALREADY USED'}
                    {result.kind === 'INVALID' && 'INVALID'}
                    {result.kind === 'CANCELLED' && 'CANCELLED'}
                    {result.kind === 'NETWORK' && 'NOT VERIFIED'}
                  </p>
                  <p className="ch-scan__verdict-text">
                    {result.kind === 'ACCEPTED' && 'Checked in now. Do not admit this ticket again.'}
                    {result.kind === 'ALREADY_USED' && `Checked in ${formatTime(result.data.ticket?.checkedInAt)}${result.data.ticket?.checkedInBy ? ` by ${result.data.ticket.checkedInBy}` : ''}.`}
                    {result.kind === 'INVALID' && (REASONS[result.data.reason] || 'This ticket is not valid.')}
                    {result.kind === 'CANCELLED' && 'This ticket was cancelled.'}
                    {result.kind === 'NETWORK' && result.message}
                  </p>
                </div>
              </div>

              {result.data?.ticket && (
                <dl className="ch-scan__details">
                  <div>
                    <dt>Guest</dt>
                    <dd>{result.data.ticket.holderName}</dd>
                  </div>
                  <div>
                    <dt>Ticket</dt>
                    <dd>
                      {result.data.ticket.ticketType}
                      {result.data.ticket.isDemo ? ' · DEMO' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Ticket ID</dt>
                    <dd className="ch-ae-mono">{result.data.ticket.ticketId}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{result.data.ticket.holderPhone}</dd>
                  </div>
                  <div className="ch-scan__details-wide">
                    <dt>Event</dt>
                    <dd>{result.data.ticket.event.title}</dd>
                  </div>
                </dl>
              )}

              <div className="ch-scan__next">
                {result.kind === 'NETWORK' && (
                  <Button variant="secondary" onClick={() => submit(result.code)} isLoading={busy}>
                    Try again
                  </Button>
                )}
                <Button variant="primary" size="lg" onClick={scanNext} disabled={busy} autoFocus>
                  Scan next
                </Button>
              </div>
            </>
          )}

          <button type="button" className="ch-scan__sound" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
            {sound ? <FiVolume2 aria-hidden="true" /> : <FiVolumeX aria-hidden="true" />} Sound {sound ? 'on' : 'off'}
          </button>
        </section>
      </div>
    </div>
  );
}
