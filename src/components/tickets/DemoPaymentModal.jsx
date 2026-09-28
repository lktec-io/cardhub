import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiLock } from 'react-icons/fi';
import { Button, Modal } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTzs, formatTzPhone } from '../../utils/money';
import { DEMO_PIN } from '../../constants/tickets';

/**
 * DEMO PAYMENT MODE confirmation screen.
 *
 * The "PIN" here is a fixed, published demo code (constants/tickets.js),
 * checked in the browser only. It is never sent to the API, never stored
 * and never logged. The confirm request (ticketsService.confirmDemoPayment)
 * has no body at all. Requiring a fixed code that isn't the buyer's own
 * means nobody is invited to type a real M-Pesa/Airtel/Tigo/Halotel PIN
 * into CardHub. A live gateway replaces this whole screen with the
 * provider's own USSD/STK push or hosted checkout.
 */
export function DemoPaymentModal({ isOpen, amountTzs, payerPhone, onCancel, onConfirm, isConfirming }) {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const onCancelRef = useRef(onCancel);
  const isConfirmingRef = useRef(isConfirming);
  useEffect(() => {
    onCancelRef.current = onCancel;
    isConfirmingRef.current = isConfirming;
  });

  // Must keep a stable identity: Modal re-runs its focus effect whenever
  // onClose changes, which would pull focus out of the PIN field on every keystroke.
  // Modal focuses its dialog container on open. This effect runs after it (parent effects run after child effects), so the PIN field ends up focused.
  const pinRef = useRef(null);
  useEffect(() => {
    if (isOpen) pinRef.current?.focus();
  }, [isOpen]);

  const close = useCallback(() => {
    if (isConfirmingRef.current) return;
    setPin('');
    setError('');
    onCancelRef.current();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (pin !== DEMO_PIN) {
      setError(t('tix.demo.wrongPin', { pin: DEMO_PIN }));
      return;
    }
    setError('');
    setPin('');
    onConfirm();
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={t('tix.demo.title')} size="sm" className="ch-tix-modal">
      <form className="ch-tix-demo" onSubmit={handleSubmit} autoComplete="off">
        <p className="ch-tix-demo__mode">
          <FiAlertTriangle aria-hidden="true" />
          {t('tix.demo.modeBadge')}
        </p>

        <div className="ch-tix-demo__summary">
          <p className="ch-tix-label">{t('tix.demo.payTo')}</p>
          <p className="ch-tix-demo__merchant">CardHub Tickets</p>
          <p className="ch-tix-demo__amount">{formatTzs(amountTzs)}</p>
          {payerPhone && <p className="ch-tix-demo__phone">{formatTzPhone(payerPhone)}</p>}
        </div>

        <label className="ch-tix-demo__pin-label" htmlFor="ch-tix-demo-pin">
          <FiLock aria-hidden="true" />
          {t('tix.demo.enterPin')}
        </label>
        <input
          id="ch-tix-demo-pin"
          className={`ch-tix-demo__pin ${error ? 'ch-tix-demo__pin--error' : ''}`}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
            if (error) setError('');
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby="ch-tix-demo-hint"
          disabled={isConfirming}
          ref={pinRef}
        />
        {error ? (
          <p className="ch-tix-demo__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="ch-tix-demo__hint" id="ch-tix-demo-hint">
            {t('tix.demo.pinHint', { pin: DEMO_PIN })}
          </p>
        )}

        <div className="ch-tix-demo__actions">
          <Button type="button" variant="ghost" onClick={close} disabled={isConfirming}>
            {t('tix.cancel')}
          </Button>
          <Button type="submit" variant="brand" isLoading={isConfirming} disabled={pin.length !== 4}>
            {t('tix.demo.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
