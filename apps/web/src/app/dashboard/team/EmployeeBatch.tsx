'use client';
import { useRef, useState } from 'react';
import { useUnsavedWarning } from '../../../hooks/useUnsavedWarning';
import { apiRequest } from '../../../lib/api';
const employees = ['Roberto', 'Rick', 'Justin', 'Leo', 'Roy', 'Obi'].map(name => ({ name, username: name.toLowerCase() }));
interface Account { name: string; username: string; created: boolean; password?: string; }
export function EmployeeBatch({ onCreated }: { onCreated: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const lock = useRef(false);
  const [downloaded, setDownloaded] = useState(false);
  const environment = process.env.NEXT_PUBLIC_API_URL?.includes('api-test') ? 'Testomgeving' : 'Productie';
  useUnsavedWarning(!!accounts?.some(a => a.created) && !downloaded, 'De nieuwe inloggegevens zijn nog niet gedownload. Wil je dit scherm verlaten?', busy);
  async function create() {
    if (lock.current || !window.confirm('Maak accounts voor Roberto, Rick, Justin, Leo, Roy en Obi in deze omgeving? Nieuwe accounts krijgen de rol Glaszetter en toegang tot de bedrijfsgegevens. Bestaande accounts en wachtwoorden worden behouden.')) return;
    lock.current = true; setBusy(true); setError('');
    try { setAccounts(await apiRequest<Account[]>('/users/employee-batch', { method: 'POST', body: JSON.stringify({ employees }) })); onCreated(); }
    catch { setError('Aanmaken is niet bevestigd. Controleer de medewerkerlijst. Bestaande accounts worden bij opnieuw proberen behouden; hun wachtwoorden worden niet opnieuw uitgegeven.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function download() {
    if (!accounts) return;
    const text = `Glaszetter Snel — ${environment}\nWebsite: ${window.location.origin}\n\n` + accounts.map(account => `${account.name}\nGebruikersnaam: ${account.username}\n${account.created ? 'Wachtwoord: ' + account.password : 'Bestaand account: gebruik het bestaande wachtwoord.'}\n`).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `Glaszetter-Snel-Medewerkeraccounts-${environment}.txt`; link.click(); setDownloaded(true);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="glass-panel urgent-form" style={{ padding: 20, marginBottom: 24 }}>
    <h2>Medewerkeraccounts klaarzetten</h2>
    <p>Roberto (roberto), Rick (rick), Justin (justin), Leo (leo), Roy (roy) en Obi (obi).</p>
    <p>Nieuwe medewerkers krijgen de rol Glaszetter. Een bestaand account met dezelfde naam wordt gekoppeld; bij een onduidelijke overeenkomst stopt de hele aanvraag.</p>
    {!accounts && <button className="sapphire-button" type="button" disabled={busy} onClick={() => void create()}>{busy ? 'Aanmaken…' : 'Zes medewerkeraccounts aanmaken'}</button>}
    {error && <p role="alert">{error}</p>}
    {accounts && <><p role="status">{accounts.filter(a => a.created).length} nieuwe accounts aangemaakt; {accounts.filter(a => !a.created).length} bestaande accounts gekoppeld.</p><button type="button" className="sapphire-button" onClick={download}>Inloggegevens downloaden</button><p>Download de gegevens voordat je dit scherm sluit. Bewaar het bestand privé en geef iedere medewerker uitsluitend diens eigen gegevens.</p></>}
  </section>;
}
