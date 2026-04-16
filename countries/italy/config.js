const path = require('path');
const { markDivEditable, bold } = require('../../lib/html-utils');

// ── Reference values exactly as they appear in the unmodified Italy template ──

const REFERENCE_TEXT = {
  surname:               'CHEERAKUZHIYIL SASIDHARAN',
  first_name:            'SHAMILI',
  place_of_birth:        'ERNAKULAM KERALA',
  country_of_birth:      'INDIA',                        // also covers "issued by" (same value)
  nationality:           'INDIAN',
  dob:                   '13/07/1995',
  passport_number:       'U5199339',
  date_of_issue:         '26/02/2020',
  valid_until:           '25/02/2030',
  email:                 'sindamili@gmail.com',
  occupation:            'Health Care Assistant',
  residence_valid_until: '14/03/2029',
  arrival_date:          '09/05/2026',
  departure_date:        '21/05/2026',
  sign_date:             '14/04/2026',
  telephone:             '+44 7435853124',
  hotel_name:            'Oceania Paris Porte De Versailles',
  hotel_telephone:       '+33 1 56 09 09 09',
  hotel_email:           'oceania.paris@oceaniahotels.com',
  home_address:          '48 Collingwood Road, Southsea, Hampshire, PO52QZ.',
  hotel_address:         '52 Rue d&apos;Oradour-sur-Glane, 75015 Paris, France',
  main_destination:      'FRANCE , ITALY',
  first_entry:           '>FRANCE</div>',                // unique anchor
  place_date:            '>London</div>',                // unique anchor
};

const REFERENCE_SPAN = {
  // Share-code permit value is broken across <span class="ff7"> tags
  residence_permit: {
    old: 'S4J<span class="ff7"> </span>E<span class="ff7">W8 7ZB</span>',
  },
  // Employer name + address + phone all in one div (plain text, no spans)
  employer: {
    old: 'Alton Manor Care Home, 8-12 Herbert Road, Southsea, Hampshire, PO4 0QA.      +44 2392862904',
  },
};

// Italy uses □ (U+25A1) for empty checkboxes, mostly inside multi-option inline rows.
// Each `inline_text` option targets a unique text anchor immediately following □.
const CHECKBOXES = {
  sex: {
    male:   { type: 'inline_text', after: ' Male' },
    female: { type: 'inline_text', after: '<span class="_ _1"></span> Female' },
  },
  civil_status: {
    single:     { type: 'inline_text', after: ' Single \u25A1' },
    married:    { type: 'inline_text', after: ' M<span class="_ _1"></span>arried' },
    registered: { type: 'inline_text', after: ' Re<span class="_ _1"></span>gistered Partnershi<span class="_ _1"></span>p' },
    separated:  { type: 'inline_text', after: ' Separated' },
    divorced:   { type: 'inline_text', after: ' Divorced' },
    widow:      { type: 'inline_text', after: ' Widow(e<span class="_ _1"></span>r)' },
  },
  travel_doc_type: {
    ordinary:   { type: 'inline_text', after: ' Ordina<span class="_ _1"></span>ry passport' },
    diplomatic: { type: 'inline_text', after: ' Diplomat<span class="_ _1"></span>ic passport' },
    service:    { type: 'inline_text', after: '<span class="_ _1"></span> Service passport' },
    official:   { type: 'inline_text', after: 'Offici<span class="_ _1"></span>al passport' },
    special:    { type: 'inline_text', after: ' Spe<span class="_ _1"></span>cial passport' },
  },
  purpose: {
    tourism:         { type: 'inline_text', after: ' Tourism' },
    business:        { type: 'inline_text', after: ' B<span class="_ _1"></span>usiness' },
    visiting:        { type: 'inline_text', after: ' Visit<span class="_ _1"></span>ing family or friend<span class="_ _1"></span>s' },
    cultural:        { type: 'inline_text', after: ' Cultural' },
    sports:          { type: 'inline_text', after: ' Sports' },
    official:        { type: 'inline_text', after: 'Official visit' },
    medical:         { type: 'inline_text', after: ' Medical<span class="_ _1"></span> reasons' },
    study:           { type: 'inline_text', after: ' Study' },
    airport_transit: { type: 'inline_text', after: ' Airport transit' },
  },
  num_entries: {
    single:   { type: 'inline_text', after: ' Single entry' },
    two:      { type: 'inline_text', after: ' Two e<span class="_ _1"></span>ntries' },
    multiple: { type: 'inline_text', after: '<span class="_ _1"></span><span class="ff1"> Multiple entries' },
  },
  family_relation: {
    spouse:     { type: 'inline_text', after: ' spouse' },
    child:      { type: 'inline_text', after: ' child' },
    grandchild: { type: 'inline_text', after: ' grandchil<span class="_ _1"></span>d' },
    dependent:  { type: 'inline_text', after: ' dependent asc<span class="_ _1"></span>endant' },
  },
  // Fingerprints box pair lives inside a div whose text starts with "28. Fingerprints..."
  // — both options share the same line: "□<span class="_ _1"></span> No □ Yes."
  fingerprints: {
    no:  { type: 'inline_text', after: '<span class="_ _1"></span> No \u25A1 Yes' },
    yes: { type: 'inline_text', before: '<span class="_ _1"></span> No ', after: ' Yes' },
  },
  residence: {
    no:  { type: 'inline_text', after: ' No<span class="ff1">' },
    yes: { type: 'inline_text', after: ' Yes. Residenc' },
  },
  cost_applicant: {
    by_applicant:           { type: 'inline_text', after: ' by the<span class="_ _1"></span> applicant himself/he<span class="_ _1"></span>rself' },
    cash:                   { type: 'inline_text', after: ' Cash' },
    travellers_cheques:     { type: 'inline_text', after: ' <span class="ls0">Traveller' },
    credit_card:            { type: 'inline_text', after: ' Credit<span class="_ _1"></span> card' },
    pre_paid_accommodation: { type: 'inline_text', after: ' Pre<span class="ff1">-paid acc' },
    pre_paid_transport:     { type: 'inline_text', after: ' Pre<span class="ff1">-paid tr' },
  },
};

function applyTextReplacements(html, data) {
  const simpleMap = [
    ['surname',               REFERENCE_TEXT.surname],
    ['first_name',            REFERENCE_TEXT.first_name],
    ['place_of_birth',        REFERENCE_TEXT.place_of_birth],
    ['nationality',           REFERENCE_TEXT.nationality],
    ['dob',                   REFERENCE_TEXT.dob],
    ['passport_number',       REFERENCE_TEXT.passport_number],
    ['date_of_issue',         REFERENCE_TEXT.date_of_issue],
    ['valid_until',           REFERENCE_TEXT.valid_until],
    ['email',                 REFERENCE_TEXT.email],
    ['occupation',            REFERENCE_TEXT.occupation],
    ['residence_valid_until', REFERENCE_TEXT.residence_valid_until],
    ['arrival_date',          REFERENCE_TEXT.arrival_date],
    ['departure_date',        REFERENCE_TEXT.departure_date],
    ['sign_date',             REFERENCE_TEXT.sign_date],
    ['telephone',             REFERENCE_TEXT.telephone],
    ['hotel_name',            REFERENCE_TEXT.hotel_name],
    ['hotel_telephone',       REFERENCE_TEXT.hotel_telephone],
    ['hotel_email',           REFERENCE_TEXT.hotel_email],
    ['home_address',          REFERENCE_TEXT.home_address],
    ['hotel_address',         REFERENCE_TEXT.hotel_address],
    ['main_destination',      REFERENCE_TEXT.main_destination],
  ];

  for (const [field, oldVal] of simpleMap) {
    if (data[field]) {
      html = markDivEditable(html, oldVal, 'text', { loose: true });
      html = html.replaceAll(oldVal, bold(data[field]));
    }
  }

  // country_of_birth doubles as "issued by" since both are "INDIA"
  if (data.country_of_birth) {
    html = markDivEditable(html, REFERENCE_TEXT.country_of_birth, 'text', { loose: true });
    html = html.replaceAll(REFERENCE_TEXT.country_of_birth, bold(data.country_of_birth));
  }

  // Anchor-based replacements (unique HTML patterns ending in </div>)
  if (data.first_entry) {
    html = html.replace(REFERENCE_TEXT.first_entry, ` data-editable="text">${bold(data.first_entry)}</div>`);
  }
  if (data.place_date) {
    html = html.replace(REFERENCE_TEXT.place_date, ` data-editable="text">${bold(data.place_date)}</div>`);
  }

  // Span-split: residence permit (share code)
  if (data.residence_permit) {
    html = markDivEditable(html, 'S4J', 'text', { loose: true });
    html = html.replace(REFERENCE_SPAN.residence_permit.old, bold(data.residence_permit));
  }

  // Combined: employer name + address + phone in one div
  if (data.employer_name || data.employer_address || data.employer_telephone) {
    const parts = [];
    if (data.employer_name && data.employer_address) {
      parts.push(`${data.employer_name}, ${data.employer_address}`);
    } else if (data.employer_name) {
      parts.push(data.employer_name);
    } else if (data.employer_address) {
      parts.push(data.employer_address);
    }
    if (data.employer_telephone) parts.push(data.employer_telephone);
    const combined = parts.join('      ');
    html = markDivEditable(html, 'Alton Manor Care Home', 'text', { loose: true });
    html = html.replace(REFERENCE_SPAN.employer.old, bold(combined));
  }

  return html;
}

module.exports = {
  name: 'Italy',
  slug: 'italy',
  templatePath: path.join(__dirname, 'template.html'),
  pdfFilenamePrefix: 'schengen-italy',
  checkboxGlyphs: { empty: '\u25A1', checked: '\u2611' },
  checkboxes: CHECKBOXES,
  defaults: {
    main_destination: 'Italy',
    first_entry:      'Italy',
    purpose:          'tourism',
    num_entries:      'multiple',
    travel_doc_type:  'ordinary',
    residence:        'yes',
    cost_applicant:   ['by_applicant', 'cash', 'pre_paid_accommodation', 'pre_paid_transport'],
  },
  dbCountryFilter: '%taly%',
  applyTextReplacements,
};
