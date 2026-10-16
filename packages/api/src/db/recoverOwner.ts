import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { Pool } from 'pg';
import { inspectOwner, parseRecoveryTarget, recoverOwner, RecoveryError, validateNewPassword } from './ownerRecovery';

async function main(): Promise<void> {
  const target=parseRecoveryTarget(process.argv.slice(2));
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new RecoveryError('Gebruik een interactieve terminal. Invoer via pipe of bestand is uitgeschakeld.');
  let hidden=false;
  const output=new Writable({write(chunk,_encoding,done){ if(!hidden) process.stdout.write(chunk); done(); }});
  const rl=createInterface({input:process.stdin,output,terminal:true});
  let cancelled=false;
  rl.on('SIGINT',()=>{cancelled=true;rl.close();});
  const ask=(prompt:string,secret=false)=>new Promise<string>((resolve,reject)=>{
    if(cancelled){reject(new RecoveryError('Herstel afgebroken.'));return;}
    process.stdout.write(prompt);hidden=secret;
    const closed=()=>{hidden=false;reject(new RecoveryError('Herstel afgebroken.'));};
    rl.once('close',closed);
    rl.question('',answer=>{rl.removeListener('close',closed);hidden=false;if(secret)process.stdout.write('\n');resolve(answer);});
  });
  let pool:Pool|undefined;
  try {
    const connectionString=process.env.DATABASE_URL || await ask('Externe databaseverbindings-URL (verborgen): ',true);
    let parsed:URL;
    try{parsed=new URL(connectionString);}catch{throw new RecoveryError('Ongeldige databaseverbindings-URL.');}
    if(!['postgres:','postgresql:'].includes(parsed.protocol)) throw new RecoveryError('Een PostgreSQL-verbindings-URL is vereist.');
    // Require a valid server certificate; never weaken certificate validation for recovery.
    for(const key of ['sslmode','sslcert','sslkey','sslrootcert']) parsed.searchParams.delete(key);
    pool=new Pool({connectionString:parsed.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:15000,max:1});
    const company=await inspectOwner(pool,target);
    console.log(`Bestaand beheeraccount: ${target.email}\nBedrijf: ${company}\nBedrijf-ID: ${target.companyId}\nGebruiker-ID: ${target.userId}`);
    const confirm=await ask('Typ het getoonde e-mailadres exact om dit account te herstellen: ');
    if(confirm!==target.email) throw new RecoveryError('Bevestiging komt niet overeen. Niets gewijzigd.');
    let password=await ask('Nieuw wachtwoord (verborgen, minstens 16 tekens): ',true);
    validateNewPassword(password);
    let repeated=await ask('Herhaal nieuw wachtwoord (verborgen): ',true);
    if(password!==repeated) throw new RecoveryError('De wachtwoorden verschillen. Niets gewijzigd.');
    await recoverOwner(pool,target,password);password='';repeated='';
    console.log('Wachtwoord van het bestaande beheeraccount bijgewerkt. Klussen, meetbonnen en medewerkers zijn behouden.');
    console.log('Bestaande ingelogde sessies blijven geldig tot hun normale vervaldatum (maximaal 7 dagen).');
  } finally {rl.close();if(pool)await pool.end();}
}
main().catch(error=>{
  // Database errors can contain connection details. Never print raw errors or secrets.
  console.error(error instanceof RecoveryError?error.message:'Herstel mislukt. Controleer de databaseverbinding en accountgegevens. Gevoelige foutdetails worden niet getoond.');
  process.exitCode=1;
});
