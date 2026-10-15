// One-time import explicitly requested for the existing production company on 15 October 2026.
// No account changes, network requests, notifications, or real contact details.
const companyId = '5220781f-633a-453e-93a2-74f9b5235a44';
const id = (kind, index) => `20261015-${kind}-4000-8000-${String(index).padStart(12, '0')}`;
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
const streets = [
  ['Zaandam', 'Westzijde'], ['Zaandam', 'Oostzijde'], ['Zaandam', 'Gedempte Gracht'],
  ['Zaandam', 'Zuiddijk'], ['Zaandam', 'Provincialeweg'], ['Zaandam', 'Dam'],
  ['Zaandam', 'Rozengracht'], ['Zaandam', 'Peperstraat'], ['Zaandam', 'Stationsstraat'], ['Zaandam', 'Rustenburg'],
  ['Amsterdam', 'Prinsengracht'], ['Amsterdam', 'Keizersgracht'], ['Amsterdam', 'Herengracht'],
  ['Amsterdam', 'Singel'], ['Amsterdam', 'Overtoom'], ['Amsterdam', 'Haarlemmerstraat'],
  ['Amsterdam', 'Ceintuurbaan'], ['Amsterdam', 'Linnaeusstraat'], ['Amsterdam', 'Bilderdijkstraat'], ['Amsterdam', 'Damrak'],
];
const stages = ['measuring', 'quote', 'approved', 'ordered', 'delivery_expected', 'concept', 'scheduled', 'in_progress', 'completion', 'completed'];
const titles = ['Inmeten woonkamer', 'Offerte keukenruit', 'Vervanging slaapkamer', 'Bestelling voorruit', 'Levering deurglas', 'Nieuwe aanvraag', 'Montage ingepland', 'Montage bezig', 'Oplevering controleren', 'Afgeronde oefenklus'];
const sizes = [[875, 484, 'HR++', 'fixed_window'], [1200, 1100, 'HR++', 'tilt_turn'], [650, 1500, 'Gelaagd 33.1', 'casement'], [1000, 900, 'HR++', 'fixed_window'], [610, 2005, 'Gelaagd veiligheidsglas', 'door']];
const dayOffsets = [0, 1, 4, 5, 6, 7, 8, 11, 12, 13];

exports.up = pgm => {
  // Even a copy of the production company must not receive this import in the separate test environment.
  if (process.env.APP_ENV === 'test') return;
  const jobs = streets.map((_, i) => quote(id('1003', i + 1))).join(',');
  const statements = streets.map(([city, street], i) => {
    const index = i + 1, position = i % 10, measured = position < 5;
    const code = `${city === 'Zaandam' ? 'ZD' : 'AMS'}-${String(position + 1).padStart(2, '0')}`;
    const customerName = `TEST ${code} - fictieve klant`;
    const jobName = `TEST ${code} - ${titles[position]}`;
    const note = `TESTDATA ZAAN-AMSTERDAM 2026-10-15. Fictieve oefenklus in ${city}; geen echte opdracht of bestelling. Straat zonder huisnummer; geen echt klantadres.`;
    const job = quote(id('1003', index)), project = quote(id('1002', index)), customer = quote(id('1001', index));
    const ordered = stages[position] === 'ordered' || stages[position] === 'delivery_expected';
    let sql = `
      INSERT INTO customers(id,company_id,name,address,city,country)
        VALUES(${customer},target_company,${quote(customerName)},${quote(street)},${quote(city)},'Nederland');
      INSERT INTO projects(id,company_id,customer_id,name,address,city,description,status)
        VALUES(${project},target_company,${customer},${quote(`TEST ${code} - ${street}`)},${quote(street)},${quote(city)},${quote(note)},'active');
      INSERT INTO jobs(id,company_id,project_id,name,status,team_id,scheduled_date,due_date,notes,supplier_name,delivery_date)
        VALUES(${job},target_company,${project},${quote(jobName)},${quote(stages[position])},chosen_team,
          DATE '2026-10-15' + ${dayOffsets[position]},
          ((DATE '2026-10-15' + ${dayOffsets[position]})::timestamp + INTERVAL '9 hours') AT TIME ZONE 'Europe/Amsterdam',
          ${quote(note)},${ordered ? "'TEST - fictieve glasleverancier'" : 'NULL'},${ordered ? "DATE '2026-10-23'" : 'NULL'});`;
    if (measured) {
      const [width, height, glassType, type] = sizes[position];
      const elementCode = type === 'door' ? 'D01' : 'R01';
      const location = position === 4 ? 'Achterdeur' : ['Woonkamer', 'Keuken', 'Slaapkamer', 'Voorgevel'][position];
      const measureNote = `TEST ${code}: ${location}, buitenwerks glas ${width} x ${height} mm. Controleer maten voor echt gebruik.`;
      const data = {fields: {name: customerName, street, city, date: '15-10-2026'}, checks: {g1c0: true, g2c1: true, g3c1: true}, lines: [{quantity: 1, width, height, glassType, notes: measureNote}]};
      sql += `
        INSERT INTO elements(id,company_id,job_id,project_id,code,type,location,notes)
          VALUES(${quote(id('1004', index))},target_company,${job},${project},${quote(elementCode)},${quote(type)},${quote(location)},${quote(measureNote)});
        INSERT INTO measurements(id,company_id,element_id,job_id,width,height,glass_type,notes,status)
          VALUES(${quote(id('1005', index))},target_company,${quote(id('1004', index))},${job},${width},${height},${quote(glassType)},${quote(measureNote)},${position === 0 ? "'draft'" : "'approved'"});
        INSERT INTO meetbons(job_id,data) VALUES(${job},${quote(JSON.stringify(data))}::jsonb);`;
    }
    return sql;
  }).join('\n');
  pgm.sql(`DO $$
    DECLARE
      target_company uuid := '${companyId}';
      chosen_team uuid;
      existing_count integer;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM companies WHERE id=target_company AND name='Glaszetter Snel Demo') THEN
        RETURN;
      END IF;
      SELECT count(*) INTO existing_count FROM jobs WHERE company_id=target_company AND id IN (${jobs});
      IF existing_count=20 THEN RETURN; END IF;
      IF existing_count<>0 THEN RAISE EXCEPTION 'Regionale oefenset is gedeeltelijk aanwezig; import gestopt om bestaande invoer te bewaren.'; END IF;
      SELECT tm.team_id INTO chosen_team FROM team_members tm JOIN users u ON u.id=tm.user_id
        JOIN teams t ON t.id=tm.team_id WHERE u.company_id=target_company AND t.company_id=target_company AND u.username='justin'
        ORDER BY tm.team_id LIMIT 1;
      ${statements}
    END;
    $$;`);
};
exports.down = () => { throw new Error('Oefenklussen kunnen inmiddels eigen invoer bevatten. Verwijder ze alleen via een expliciete, gecontroleerde gegevensactie.'); };
