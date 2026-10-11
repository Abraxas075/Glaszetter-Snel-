import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { verifyPin } from '../lib/pin';
import type { PinData } from '../lib/types';

export default function Lock({ pin, onUnlock }: { pin: PinData; onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);

  const wait = Math.max(0, Math.ceil((until - now) / 1000));

  const submit = async () => {
    if (busy || wait > 0 || valueRef.current.length < 4) return;
    setBusy(true);
    const ok = await verifyPin(valueRef.current, pin);
    setBusy(false);
    if (ok) return onUnlock();
    const f = fails + 1;
    setFails(f);
    setValue('');
    setError('Onjuiste pincode');
    if (f % 5 === 0) {
      setUntil(Date.now() + 30_000);
      setNow(Date.now());
    }
  };

  const press = (d: string) => {
    if (wait > 0) return;
    setError('');
    setValue((v) => (v.length < 6 ? v + d : v));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setValue((v) => v.slice(0, -1));
      else if (e.key === 'Enter') void submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-xs flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-lav text-accent">
        <Icon name="lock" className="size-8" />
      </div>
      <h1 className="text-2xl font-extrabold">Voer je pincode in</h1>
      <div className="my-5 flex h-6 gap-3" aria-label={`${value.length} cijfers ingevoerd`}>
        {Array.from({ length: Math.max(4, value.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-full border-2 border-accent ${i < value.length ? 'bg-accent' : ''}`} />
        ))}
      </div>
      <p className="mb-3 min-h-5 text-sm text-moon" role="alert">
        {wait > 0 ? `Te veel pogingen. Probeer het over ${wait} s opnieuw.` : error}
      </p>
      <div className="grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="min-h-16 rounded-2xl bg-card text-2xl font-bold shadow-sm active:bg-accent-soft">
            {d}
          </button>
        ))}
        <button type="button" aria-label="Wissen" onClick={() => setValue((v) => v.slice(0, -1))} className="min-h-16 rounded-2xl text-muted active:bg-soft">
          ⌫
        </button>
        <button type="button" onClick={() => press('0')} className="min-h-16 rounded-2xl bg-card text-2xl font-bold shadow-sm active:bg-accent-soft">
          0
        </button>
        <button type="button" aria-label="Ontgrendelen" disabled={value.length < 4 || busy || wait > 0} onClick={() => void submit()} className="min-h-16 rounded-2xl bg-accent text-white disabled:opacity-40">
          <Icon name="check" className="mx-auto size-6" />
        </button>
      </div>
    </main>
  );
}
