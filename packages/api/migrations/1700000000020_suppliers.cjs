// Supplier contacts supplied by the user and checked against the official branch pages on 2026-10-15.
exports.up = pgm => {
  pgm.createTable('suppliers', {
    id: {type:'uuid',primaryKey:true,default:pgm.func('gen_random_uuid()')},
    company_id: {type:'uuid',notNull:true,references:'companies',onDelete:'CASCADE'},
    name: {type:'text',notNull:true,check:"char_length(name) BETWEEN 1 AND 200 AND name=btrim(name)"},
    contact_person: {type:'text'}, phone:{type:'text'}, email:{type:'text'},
    address:{type:'text'}, postal_code:{type:'text'}, city:{type:'text'}, website:{type:'text'},
    notes:{type:'text'}, source_url:{type:'text'}, verified_at:{type:'date'},
    created_at:{type:'timestamptz',notNull:true,default:pgm.func('now()')},
  });
  pgm.sql('CREATE UNIQUE INDEX suppliers_company_name_unique ON suppliers(company_id,lower(name))');
  if (process.env.APP_ENV === 'test') return;
  pgm.sql(`INSERT INTO suppliers(company_id,name,contact_person,phone,email,address,postal_code,city,website,notes,source_url,verified_at)
    SELECT c.id,v.* FROM companies c CROSS JOIN (VALUES
      ('Verf- en glashandel AGC Haarlem',
       'Marco Heemskerk (vestigingsleider); Ramon Ebeltjes (accountmanager glas)',
       '023 512 4000',NULL,'Ingenieur Lelyweg 46','2031 CD','Haarlem',
       'https://www.agcnederland.nl/glashandel-haarlem/',
       'Telefoon uit aangeleverd screenshot. Adres en contactpersonen gecontroleerd op de officiële vestigingspagina. Geen vestigingsmailadres bevestigd.',
       'https://www.agcnederland.nl/glashandel-haarlem/',DATE '2026-10-15'),
      ('Verf- en glashandel AGC Beverwijk',
       'Frank van der Noll (vestigingsleider); Devlin Baas (accountmanager glas)',
       '0251 276 900',NULL,'Wijkermeerweg 36','1948 NW','Beverwijk',
       'https://www.agcnederland.nl/glashandel-beverwijk/',
       'Telefoon uit aangeleverd screenshot. Adres en contactpersonen gecontroleerd op de officiële vestigingspagina. Geen vestigingsmailadres bevestigd.',
       'https://www.agcnederland.nl/glashandel-beverwijk/',DATE '2026-10-15'),
      ('Vandaglas Amsterdam West',NULL,'020 613 2551','west@vandaglas.com',
       'Jarmuiden 16','1046 AD','Amsterdam','https://vandaglas.com/contact/',
       'Vestiging Amsterdam / Regio West. Adres en telefoon komen overeen met het screenshot; e-mailadres bevestigd op de officiële contactpagina.',
       'https://vandaglas.com/contact/',DATE '2026-10-15')
    ) AS v(name,contact_person,phone,email,address,postal_code,city,website,notes,source_url,verified_at)
    WHERE c.id='5220781f-633a-453e-93a2-74f9b5235a44'
    ON CONFLICT DO NOTHING;`);
};
exports.down = () => { throw new Error('Leveranciersgegevens behouden: terugrollen vereist een expliciete gegevensmigratie.'); };
