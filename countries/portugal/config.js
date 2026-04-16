const path = require('path');
const { markDivEditable, bold } = require('../../lib/html-utils');

// ── Tharshiga's original values (exact strings from the unmodified Portugal template) ──

const REFERENCE_TEXT = {
  surname:                'MANOGARAN',
  first_name:             'THARSHIGA',
  dob:                    '26/10/1985',
  place_of_birth:         'KAYTS',
  country_of_birth:       'SRI LANKA',   // appears 2x (country of birth + issued by)
  nationality:            'SRI LANKAN',
  passport_number:        'N8605363',
  date_of_issue:          '20/11/2019',
  valid_until:            '20/11/2029',
  email:                  'rajeevankosal@yahoo.com',
  occupation:             'SHOP ASSISTENCE',
  residence_permit:       'SX7 MZ9 7AZ',
  residence_valid_until:  '12/12/2027',
  arrival_date:           '01/05/2026',
  departure_date:         '05/05/2026',
  sign_date:              '30/03/2026',
  telephone:              '+44 7427448720',
  employer_telephone:     '+44 1392459552',
  first_entry:            '>Portugal</div>',  // unique anchor
  place_date:             '>London</div>',    // unique anchor
};

const REFERENCE_SPAN = {
  home_address: {
    old: '107,<span class="_"> </span>Okehampton<span class="_"> </span>Road,<span class="_"> </span>Exeter,<span class="_"> </span>EX41EP',
  },
  employer: {
    old: 'OKEHAMPTON ROAD POST OFFICE,107 OKEHAMTON ROAD,EXETER,<span class="ff8"> </span>EX41EP',
  },
  main_destination: {
    old: 'Portugal,<span class="ffa"> </span>Germany',
  },
  hotel_phone_and_address: {
    old: '+351<span class="_ _4"> </span>21<span class="_ _4"> </span>849<span class="_ _12"> </span>3150<span class="_ _13"></span><span class="ff8">Praça Francisco Sá Carneiro, 4, Areeiro, 1000 -159 </span>',
  },
  hotel_email: {
    old: 'Lisbon,reservas@residencialardoareeiro.com',
  },
  hotel_name: {
    old: 'Residencial do Areeiro',
  },
};

// All checkbox options with their (x, y) positions (extracted from Portugal template CSS).
// type: 'div' = standalone box in its own div; 'inline'/'inline_last' = inside a span.
const CHECKBOXES = {
  sex: {
    male:   { x: 102.276, y: 466.815, type: 'div' },
    female: { x: 102.276, y: 450.795, type: 'div' },
    other:  { x: 102.276, y: 433.515, type: 'div' },
  },
  civil_status: {
    single:     { x: 248.610, y: 466.815, type: 'div' },
    married:    { x: 295.095, y: 466.815, type: 'div' },
    registered: { x: 355.035, y: 466.815, type: 'div' },
    separated:  { x: 495.105, y: 466.815, type: 'div' },
    divorced:   { x: 565.845, y: 466.815, type: 'div' },
    widow:      { x: 629.250, y: 466.815, type: 'div' },
    other:      { x: 312.555, y: 449.535, type: 'div' },
  },
  travel_doc_type: {
    ordinary:   { x: 102.276, y: 1129.11, type: 'div' },
    diplomatic: { x: 216.390, y: 1129.11, type: 'div' },
    service:    { x: 342.256, y: 1129.11, type: 'div' },
    official:   { x: 102.276, y: 1111.47, type: 'div' },
    special:    { x: 204.690, y: 1111.47, type: 'div' },
    other:      { x: 102.276, y: 1094.91, type: 'div' },
  },
  purpose: {
    tourism:         { x: 102.276, y: 407.235, type: 'div' },
    business:        { x: 162.390, y: 407.235, type: 'div' },
    visiting:        { x: 227.370, y: 407.235, type: 'div' },
    sports:          { x: 440.175, y: 407.235, type: 'div' },
    official:        { x: 491.686, y: 407.235, type: 'div' },
    medical:         { x: 573.945, y: 407.235, type: 'div' },
    study:           { type: 'inline', label_before: 'y <span class="_ _0"></span><span class="ff5">' },
    airport_transit: { type: 'inline', label_before: 'it <span class="_ _0"></span><span class="ff5">' },
    other:           { type: 'inline_last' },
  },
  num_entries: {
    single:   { x: 102.276, y: 184.53, type: 'div' },
    two:      { x: 182.190, y: 184.53, type: 'div' },
    multiple: { x: 264.135, y: 184.53, type: 'div' },
  },
  fingerprints: {
    no:  { x: 138.276, y: 1091.85, type: 'div' },
    yes: { x: 171.031, y: 1091.85, type: 'div' },
  },
  residence: {
    no:  { x: 102.276, y: 615.345, type: 'div' },
    yes: { x: 102.276, y: 598.035, type: 'div' },
  },
  family_relation: {
    spouse:     { x: 102.276, y: 753.225, type: 'div' },
    child:      { x: 155.190, y: 753.225, type: 'div' },
    grandchild: { x: 197.849, y: 753.225, type: 'div' },
    dependent:  { x: 273.675, y: 753.225, type: 'div' },
    registered: { x: 102.276, y: 736.125, type: 'div' },
    other:      { x: 236.911, y: 736.125, type: 'div' },
  },
  cost_applicant: {
    by_applicant:           { x: 102.276, y: 603.075, type: 'div' },
    cash:                   { x: 102.276, y: 571.935, type: 'div' },
    travellers_cheques:     { x: 102.276, y: 556.095, type: 'div' },
    credit_card:            { x: 102.276, y: 540.075, type: 'div' },
    pre_paid_accommodation: { x: 102.276, y: 523.875, type: 'div' },
    pre_paid_transport:     { x: 102.276, y: 508.035, type: 'div' },
    other:                  { x: 102.276, y: 490.755, type: 'div' },
  },
  cost_sponsor: {
    by_sponsor:             { x: 386.355, y: 601.455, type: 'div' },
    referred_to_applicant:  { x: 386.355, y: 560.775, type: 'div' },
    other:                  { x: 386.355, y: 539.355, type: 'div' },
    cash:                   { x: 386.355, y: 504.975, type: 'div' },
    accommodation:          { x: 386.355, y: 489.315, type: 'div' },
    all_expenses:           { x: 386.355, y: 473.295, type: 'div' },
    pre_paid_transport:     { x: 386.355, y: 457.275, type: 'div' },
    other_specify:          { x: 386.355, y: 439.995, type: 'div' },
  },
};

function applyTextReplacements(html, data) {
  const simpleMap = [
    ['surname',              REFERENCE_TEXT.surname],
    ['first_name',           REFERENCE_TEXT.first_name],
    ['dob',                  REFERENCE_TEXT.dob],
    ['place_of_birth',       REFERENCE_TEXT.place_of_birth],
    ['nationality',          REFERENCE_TEXT.nationality],
    ['passport_number',      REFERENCE_TEXT.passport_number],
    ['date_of_issue',        REFERENCE_TEXT.date_of_issue],
    ['valid_until',          REFERENCE_TEXT.valid_until],
    ['email',                REFERENCE_TEXT.email],
    ['occupation',           REFERENCE_TEXT.occupation],
    ['residence_permit',     REFERENCE_TEXT.residence_permit],
    ['residence_valid_until', REFERENCE_TEXT.residence_valid_until],
    ['arrival_date',         REFERENCE_TEXT.arrival_date],
    ['departure_date',       REFERENCE_TEXT.departure_date],
    ['sign_date',            REFERENCE_TEXT.sign_date],
    ['telephone',            REFERENCE_TEXT.telephone],
    ['employer_telephone',   REFERENCE_TEXT.employer_telephone],
  ];

  // Simple text fields: always mark editable and replace the reference value
  // even when data is missing, so the form renders blank instead of showing
  // the sample traveler's data.
  for (const [field, oldVal] of simpleMap) {
    html = markDivEditable(html, oldVal, 'text');
    html = html.replaceAll(oldVal, data[field] ? bold(data[field]) : '');
  }

  // country_of_birth doubles as "issued_by" since both are "SRI LANKA"
  html = markDivEditable(html, REFERENCE_TEXT.country_of_birth, 'text');
  html = html.replaceAll(
    REFERENCE_TEXT.country_of_birth,
    data.country_of_birth ? bold(data.country_of_birth) : ''
  );

  // Anchor-based replacements (unique HTML patterns)
  html = html.replace(
    REFERENCE_TEXT.first_entry,
    ` data-editable="text">${data.first_entry ? bold(data.first_entry) : ''}</div>`
  );
  html = html.replace(
    REFERENCE_TEXT.place_date,
    ` data-editable="text">${data.place_date ? bold(data.place_date) : ''}</div>`
  );

  // Span-split replacements
  html = markDivEditable(html, '107,', 'text');
  html = html.replace(
    REFERENCE_SPAN.home_address.old,
    data.home_address ? bold(data.home_address) : ''
  );

  html = markDivEditable(html, 'OKEHAMPTON ROAD POST OFFICE', 'text');
  let employerValue = '';
  if (data.employer_name && data.employer_address) {
    employerValue = bold(`${data.employer_name},${data.employer_address}`);
  } else if (data.employer_name) {
    employerValue = bold(data.employer_name);
  } else if (data.employer_address) {
    employerValue = bold(data.employer_address);
  }
  html = html.replace(REFERENCE_SPAN.employer.old, employerValue);

  html = markDivEditable(html, 'Portugal,', 'text');
  html = html.replace(
    REFERENCE_SPAN.main_destination.old,
    data.main_destination ? bold(data.main_destination) : ''
  );

  // Hotel phone + address share one div — blank both when missing
  html = markDivEditable(html, '+351', 'text');
  const newPhone = data.hotel_telephone ? bold(data.hotel_telephone) : '';
  const newAddr = data.hotel_address ? bold(data.hotel_address) : '';
  html = html.replace(
    REFERENCE_SPAN.hotel_phone_and_address.old,
    newPhone || newAddr
      ? `${newPhone}<span class="_ _13"></span><span class="ff8">${newAddr}</span>`
      : ''
  );

  html = markDivEditable(html, 'Lisbon,reservas', 'text');
  html = html.replace(
    REFERENCE_SPAN.hotel_email.old,
    data.hotel_email ? bold(data.hotel_email) : ''
  );

  html = markDivEditable(html, 'Residencial do Areeiro', 'text');
  html = html.replace(
    REFERENCE_SPAN.hotel_name.old,
    data.hotel_name ? bold(data.hotel_name) : ''
  );

  // Fingerprints date + visa number overlay (inserted into the dotted-line container)
  if (data.fingerprints === 'yes') {
    const dotsLine = 'ate, <span class="_ _2"></span><span class="ls7">if<span class="ls0">';
    const dotsIdx = html.indexOf(dotsLine);
    if (dotsIdx !== -1) {
      const containerEnd = html.indexOf('</div></div>', dotsIdx);
      if (containerEnd !== -1) {
        let overlays = '';
        if (data.fingerprints_date) {
          overlays += `<div data-editable="text" style="position:absolute;bottom:1075.47px;left:215px;font-size:10px;font-family:'Times New Roman',serif;color:#000;z-index:10;">${data.fingerprints_date}</div>`;
        }
        if (data.fingerprints_visa_number) {
          overlays += `<div data-editable="text" style="position:absolute;bottom:1075.47px;left:512px;font-size:10px;font-family:'Times New Roman',serif;color:#000;z-index:10;">${data.fingerprints_visa_number}</div>`;
        }
        if (overlays) {
          html = html.substring(0, containerEnd) + overlays + html.substring(containerEnd);
        }
      }
    }
  }

  return html;
}

module.exports = {
  name: 'Portugal',
  slug: 'portugal',
  templatePath: path.join(__dirname, 'template.html'),
  pdfFilenamePrefix: 'schengen-portugal',
  checkboxGlyphs: { empty: '\u2610', checked: '\u2611' },
  checkboxes: CHECKBOXES,
  defaults: {
    main_destination: 'Portugal',
    first_entry:      'Portugal',
    purpose:          'tourism',
    num_entries:      'multiple',
    travel_doc_type:  'ordinary',
    residence:        'yes',
    cost_applicant:   ['by_applicant', 'cash', 'pre_paid_accommodation', 'pre_paid_transport'],
  },
  dbCountryFilter: '%ortugal%',
  applyTextReplacements,
};
