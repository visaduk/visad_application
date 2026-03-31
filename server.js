require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'visadcouk_dataf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const TEMPLATE_PATH = path.join(__dirname, 'template.html');

// ── Tharshiga's original values (exact strings from template HTML) ──

const THARSHIGA_TEXT = {
  surname:             'MANOGARAN',
  first_name:          'THARSHIGA',
  dob:                 '26/10/1985',
  place_of_birth:      'KAYTS',
  country_of_birth:    'SRI LANKA',   // appears 2x (country of birth + issued by)
  nationality:         'SRI LANKAN',
  passport_number:     'N8605363',
  date_of_issue:       '20/11/2019',
  valid_until:         '20/11/2029',
  email:               'rajeevankosal@yahoo.com',
  occupation:          'SHOP ASSISTENCE',
  residence_permit:    'SX7 MZ9 7AZ',
  residence_valid_until: '12/12/2027',
  arrival_date:        '01/05/2026',
  departure_date:      '05/05/2026',
  sign_date:           '30/03/2026',
  telephone:           '+44 7427448720',
  employer_telephone:  '+44 1392459552',
  first_entry:         '>Portugal</div>',            // unique anchor
  place_date:          '>London</div>',              // unique anchor
};

// Span-split values need exact HTML pattern matching
const THARSHIGA_SPAN = {
  home_address: {
    old: '107,<span class="_"> </span>Okehampton<span class="_"> </span>Road,<span class="_"> </span>Exeter,<span class="_"> </span>EX41EP',
  },
  employer: {
    old: 'OKEHAMPTON ROAD POST OFFICE,107 OKEHAMTON ROAD,EXETER,<span class="ff8"> </span>EX41EP',
  },
  main_destination: {
    old: 'Portugal,<span class="ffa"> </span>Germany',
  },
  // Phone + address are in ONE div: phone<span>address</span>
  // We replace the entire content of that div
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

// ── Checkbox mapping ──
// Tharshiga's template has NO checkmarks — all checkboxes are empty ☐
// We only need to ADD ticks for the new traveler's selections

// All checkbox options with their positions
// type: 'div' = standalone ☐ in its own div, 'inline' = ☐ inside a span
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
    ordinary:  { x: 102.276, y: 1129.11, type: 'div' },
    diplomatic:{ x: 216.390, y: 1129.11, type: 'div' },
    service:   { x: 342.256, y: 1129.11, type: 'div' },
    official:  { x: 102.276, y: 1111.47, type: 'div' },
    special:   { x: 204.690, y: 1111.47, type: 'div' },
    other:     { x: 102.276, y: 1094.91, type: 'div' },
  },
  purpose: {
    tourism:        { x: 102.276, y: 407.235, type: 'div' },
    business:       { x: 162.390, y: 407.235, type: 'div' },
    visiting:       { x: 227.370, y: 407.235, type: 'div' },
    sports:         { x: 440.175, y: 407.235, type: 'div' },
    official:       { x: 491.686, y: 407.235, type: 'div' },
    medical:        { x: 573.945, y: 407.235, type: 'div' },
    study:          { label_before: 'y <span class="_ _0"></span><span class="ff5">', type: 'inline' },
    airport_transit:{ label_before: 'it <span class="_ _0"></span><span class="ff5">', type: 'inline' },
    other:          { label_before: null, type: 'inline_last' },
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

// ── Helper functions ──

function replaceText(html, data) {
  // Simple text replacements
  const simpleMap = [
    ['surname',             THARSHIGA_TEXT.surname],
    ['first_name',          THARSHIGA_TEXT.first_name],
    ['dob',                 THARSHIGA_TEXT.dob],
    ['place_of_birth',      THARSHIGA_TEXT.place_of_birth],
    ['nationality',         THARSHIGA_TEXT.nationality],
    ['passport_number',     THARSHIGA_TEXT.passport_number],
    ['date_of_issue',       THARSHIGA_TEXT.date_of_issue],
    ['valid_until',         THARSHIGA_TEXT.valid_until],
    ['email',               THARSHIGA_TEXT.email],
    ['occupation',          THARSHIGA_TEXT.occupation],
    ['residence_permit',    THARSHIGA_TEXT.residence_permit],
    ['residence_valid_until', THARSHIGA_TEXT.residence_valid_until],
    ['arrival_date',        THARSHIGA_TEXT.arrival_date],
    ['departure_date',      THARSHIGA_TEXT.departure_date],
    ['sign_date',           THARSHIGA_TEXT.sign_date],
    ['telephone',           THARSHIGA_TEXT.telephone],
    ['employer_telephone',  THARSHIGA_TEXT.employer_telephone],
  ];

  for (const [field, oldVal] of simpleMap) {
    if (data[field]) {
      html = html.replaceAll(oldVal, data[field]);
    }
  }

  // country_of_birth also replaces "issued_by" since both are "SRI LANKA"
  if (data.country_of_birth) {
    html = html.replaceAll(THARSHIGA_TEXT.country_of_birth, data.country_of_birth);
  }

  // Anchor-based replacements (unique HTML patterns)
  if (data.first_entry) {
    html = html.replace(THARSHIGA_TEXT.first_entry, `>${data.first_entry}</div>`);
  }
  if (data.place_date) {
    html = html.replace(THARSHIGA_TEXT.place_date, `>${data.place_date}</div>`);
  }

  // Span-split replacements
  if (data.home_address) {
    html = html.replace(THARSHIGA_SPAN.home_address.old, data.home_address);
  }
  if (data.employer_name && data.employer_address) {
    html = html.replace(THARSHIGA_SPAN.employer.old, `${data.employer_name},${data.employer_address}`);
  } else if (data.employer_name) {
    html = html.replace('OKEHAMPTON ROAD POST OFFICE', data.employer_name);
  }
  if (data.main_destination) {
    html = html.replace(THARSHIGA_SPAN.main_destination.old, data.main_destination);
  }
  // Hotel phone + address are in ONE div: phone<span>address</span>
  // Replace the entire content with new phone + address
  const newPhone = data.hotel_telephone || '';
  const newAddr = data.hotel_address || '';
  html = html.replace(
    THARSHIGA_SPAN.hotel_phone_and_address.old,
    `${newPhone}<span class="_ _13"></span><span class="ff8">${newAddr}</span>`
  );
  // Hotel email (separate line below)
  if (data.hotel_email) {
    html = html.replace(THARSHIGA_SPAN.hotel_email.old, data.hotel_email);
  } else {
    html = html.replace(THARSHIGA_SPAN.hotel_email.old, '');
  }
  // Replace hotel name — clear if no data
  html = html.replace(THARSHIGA_SPAN.hotel_name.old, data.hotel_name || '');

  return html;
}

function handleCheckboxes(html, data) {
  // No covers needed — template has no pre-checked boxes
  // Replace ☐ with ✓ directly inside the matching div for each selected option
  const checkboxFields = [
    'sex', 'civil_status', 'travel_doc_type', 'purpose',
    'num_entries', 'fingerprints', 'residence',
    'family_relation', 'cost_applicant', 'cost_sponsor',
  ];

  for (const field of checkboxFields) {
    const value = data[field];
    if (!value) continue;

    const values = Array.isArray(value) ? value : [value];

    for (const val of values) {
      const option = CHECKBOXES[field]?.[val];
      if (!option) continue;

      if (option.type === 'div') {
        html = replaceCheckboxChar(html, option);
      } else if (option.type === 'inline') {
        if (option.label_before) {
          html = html.replace(
            option.label_before + '\u2610',
            option.label_before + '\u2611'
          );
        }
      } else if (option.type === 'inline_last') {
        html = html.replace(
          'it <span class="_ _0"></span><span class="ff5">\u2610<span class="ff1"> <span class="_ _2"></span>Ot',
          'it <span class="_ _0"></span><span class="ff5">\u2611<span class="ff1"> <span class="_ _2"></span>Ot'
        );
      }
    }
  }

  // Handle fingerprints date and visa number (overlay on the dots line)
  if (data.fingerprints === 'yes') {
    const dotsLine = 'ate, <span class="_ _2"></span><span class="ls7">if<span class="ls0">';
    const dotsIdx = html.indexOf(dotsLine);
    if (dotsIdx !== -1) {
      // Find the closing </div> of this container to insert overlays
      const containerEnd = html.indexOf('</div></div>', dotsIdx);
      if (containerEnd !== -1) {
        let overlays = '';
        if (data.fingerprints_date) {
          overlays += `<div style="position:absolute;bottom:1075.47px;left:215px;font-size:10px;font-family:'Times New Roman',serif;color:#000;z-index:10;">${data.fingerprints_date}</div>`;
        }
        if (data.fingerprints_visa_number) {
          overlays += `<div style="position:absolute;bottom:1075.47px;left:512px;font-size:10px;font-family:'Times New Roman',serif;color:#000;z-index:10;">${data.fingerprints_visa_number}</div>`;
        }
        if (overlays) {
          html = html.substring(0, containerEnd) + overlays + html.substring(containerEnd);
        }
      }
    }
  }

  return html;
}

// Replace ☐ with ☑ inside the matching checkbox div (by x,y position)
function replaceCheckboxChar(html, option) {
  const checkbox = '\u2610';
  const checked = '\u2611';
  let pos = 0;

  while (true) {
    const idx = html.indexOf(checkbox, pos);
    if (idx === -1) break;

    const searchStart = Math.max(0, idx - 500);
    const before = html.substring(searchStart, idx);
    const divMatches = [...before.matchAll(/<div class="([^"]+)">/g)];

    if (divMatches.length > 0) {
      const lastDiv = divMatches[divMatches.length - 1];
      const classes = lastDiv[1];
      const yMatch = classes.match(/\b(y[0-9a-f]+)\b/);
      const xMatch = classes.match(/\b(x[0-9a-f]+)\b/);

      if (yMatch && xMatch) {
        const yPx = getCssValue(html, yMatch[1]);
        const xPx = getCssValue(html, xMatch[1]);

        if (Math.abs(yPx - option.y) < 1 && Math.abs(xPx - option.x) < 1) {
          // Found it — replace ☐ with ☑ in place
          html = html.substring(0, idx) + checked + html.substring(idx + 1);
          return html;
        }
      }
    }
    pos = idx + 1;
  }

  return html;
}


// Cache for CSS values
const cssCache = {};
function getCssValue(html, cls) {
  if (cssCache[cls] !== undefined) return cssCache[cls];
  const regex = new RegExp(`\\.${cls}\\{([^}]+)\\}`);
  const match = html.match(regex);
  if (match && match[1].includes('px')) {
    const valMatch = match[1].match(/([\d.]+)/);
    if (valMatch) {
      cssCache[cls] = parseFloat(valMatch[1]);
      return cssCache[cls];
    }
  }
  cssCache[cls] = 0;
  return 0;
}

// ── API endpoint ──

app.post('/fill-form', (req, res) => {
  const data = req.body;

  if (!data || !data.surname) {
    return res.status(400).json({ error: 'Missing required field: surname' });
  }

  let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  // Clear CSS cache for each request
  Object.keys(cssCache).forEach(k => delete cssCache[k]);

  html = replaceText(html, data);
  html = handleCheckboxes(html, data);
  html = addAutoFitScript(html);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ── Helper: format date from DB (YYYY-MM-DD) to form (DD/MM/YYYY) ──

function formatShareCode(code) {
  if (!code) return null;
  // Remove all spaces, then format as ABC DEF GHI
  const clean = code.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 3) return clean;
  return clean.match(/.{1,3}/g).join(' ');
}

function buildInvitingName(tq) {
  const parts = [tq.inviting_person_first_name, tq.inviting_person_surname]
    .filter(v => v && v !== 'N/A');
  return parts.length > 0 ? parts.join(' ') : null;
}

function buildInvitingAddress(tq) {
  const parts = [tq.inviting_person_address_1, tq.inviting_person_address_2, tq.inviting_person_city, tq.inviting_person_state, tq.inviting_person_zip]
    .filter(v => v && v !== 'N/A');
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildInvitingPhone(tq) {
  if (!tq.inviting_person_phone || tq.inviting_person_phone === 'N/A') return null;
  const code = tq.inviting_person_phone_code || '44';
  return `+${code} ${tq.inviting_person_phone}`;
}

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Helper: map DB row to form data ──

function mapDbToForm(t, tq) {
  const address = [t.address_line_1, t.address_line_2, t.city, t.state_province, t.zip_code]
    .filter(Boolean).join(', ');

  const employerAddr = [tq.company_address_1, tq.company_city, tq.company_zip]
    .filter(Boolean).join(', ');

  // Avoid duplicating city/zip if already in address_1
  const hotelParts = [tq.hotel_address_1];
  if (tq.hotel_city && tq.hotel_address_1 && !tq.hotel_address_1.includes(tq.hotel_city)) {
    hotelParts.push(tq.hotel_city);
  }
  if (tq.hotel_zip && tq.hotel_address_1 && !tq.hotel_address_1.includes(tq.hotel_zip)) {
    hotelParts.push(tq.hotel_zip);
  }
  const hotelAddr = hotelParts.filter(Boolean).join(', ');

  // Map gender
  let sex = null;
  if (t.gender) {
    const g = t.gender.toLowerCase();
    if (g === 'male') sex = 'male';
    else if (g === 'female') sex = 'female';
    else sex = 'other';
  }

  // Map marital status
  let civil_status = null;
  if (tq.marital_status) {
    const m = tq.marital_status.toLowerCase();
    if (m.includes('single')) civil_status = 'single';
    else if (m.includes('married')) civil_status = 'married';
    else if (m.includes('registered')) civil_status = 'registered';
    else if (m.includes('separated')) civil_status = 'separated';
    else if (m.includes('divorced')) civil_status = 'divorced';
    else if (m.includes('widow')) civil_status = 'widow';
    else civil_status = 'other';
  }

  // Cost is always: by applicant + cash + pre-paid accommodation

  // Map fingerprints
  let fingerprints = null;
  if (tq.fingerprints_taken) {
    fingerprints = tq.fingerprints_taken.toLowerCase() === 'yes' ? 'yes' : 'no';
  }

  // Build phone with country code
  let telephone = null;
  if (t.contact_number) {
    const code = t.country_code || '44';
    telephone = `+${code} ${t.contact_number}`;
  }

  // Nationality text (uppercase)
  const nationalityUpper = t.nationality ? t.nationality.toUpperCase() : null;

  // Build the form data object
  const data = {
    surname:              t.last_name ? t.last_name.toUpperCase() : null,
    first_name:           t.first_name ? t.first_name.toUpperCase() : null,
    dob:                  formatDate(t.dob),
    place_of_birth:       t.place_of_birth ? t.place_of_birth.toUpperCase() : null,
    country_of_birth:     t.country_of_birth ? t.country_of_birth.toUpperCase() : null,
    nationality:          nationalityUpper ? nationalityUpper + 'N' : null, // e.g. INDIA -> INDIAN
    passport_number:      t.passport_no,
    date_of_issue:        formatDate(t.passport_issue),
    valid_until:          formatDate(t.passport_expire),
    telephone:            telephone,
    email:                t.email,
    home_address:         address,
    occupation:           tq.occupation_title ? tq.occupation_title.toUpperCase() : null,
    employer_name:        tq.company_name ? tq.company_name.toUpperCase() : null,
    employer_address:     employerAddr ? employerAddr.toUpperCase() : null,
    employer_telephone:   tq.company_phone || null,
    main_destination:     'Portugal',
    first_entry:          'Portugal',
    arrival_date:         formatDate(tq.travel_date_from),
    departure_date:       formatDate(tq.travel_date_to),
    hotel_name:           tq.hotel_name || buildInvitingName(tq) || null,
    hotel_address:        hotelAddr || buildInvitingAddress(tq) || null,
    hotel_telephone:      tq.hotel_contact_number || buildInvitingPhone(tq) || null,
    residence_permit:     formatShareCode(tq.share_code),
    residence_valid_until: formatDate(tq.evisa_expiry_date),
    sign_date:            formatDate(t.doc_date) || null,
    place_date:           t.visa_center || null,
    sex:                  sex,
    civil_status:         civil_status,
    travel_doc_type:      'ordinary',    // always ordinary passport
    purpose:              'tourism',
    num_entries:          'multiple',    // always multiple entries
    fingerprints:         fingerprints,
    residence:            'yes',
    cost_applicant:       ['by_applicant', 'cash', 'pre_paid_accommodation', 'pre_paid_transport'],
  };

  // Fix nationality — if it already ends with N/AN, don't add extra N
  if (nationalityUpper) {
    if (nationalityUpper.endsWith('AN') || nationalityUpper.endsWith('SH') || nationalityUpper.endsWith('SE') || nationalityUpper.endsWith('CH')) {
      data.nationality = nationalityUpper;
    } else if (nationalityUpper === 'INDIA') {
      data.nationality = 'INDIAN';
    } else {
      data.nationality = nationalityUpper;
    }
  }

  // Remove null values
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== null));
}

// ── DB endpoint: fill form for a traveler by ID ──

app.get('/fill-form/:id', async (req, res) => {
  try {
    const travelerId = parseInt(req.params.id);
    if (isNaN(travelerId)) {
      return res.status(400).json({ error: 'Invalid traveler ID' });
    }

    const [travelers] = await db.query(
      'SELECT * FROM travelers WHERE id = ?',
      [travelerId]
    );

    if (travelers.length === 0) {
      return res.status(404).json({ error: 'Traveler not found with ID: ' + travelerId });
    }

    const traveler = travelers[0];

    const [questions] = await db.query(
      "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'",
      [travelerId]
    );

    const tq = questions[0] || {};

    const formData = mapDbToForm(traveler, tq);

    let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    Object.keys(cssCache).forEach(k => delete cssCache[k]);

    html = replaceText(html, formData);
    html = handleCheckboxes(html, formData);
    html = addAutoFitScript(html);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DB endpoint: fill form for a dependent by ID ──

app.get('/fill-form/dependent/:id', async (req, res) => {
  try {
    const depId = parseInt(req.params.id);
    if (isNaN(depId)) {
      return res.status(400).json({ error: 'Invalid dependent ID' });
    }

    const [dependents] = await db.query(
      'SELECT * FROM dependents WHERE id = ?',
      [depId]
    );

    if (dependents.length === 0) {
      return res.status(404).json({ error: 'Dependent not found with ID: ' + depId });
    }

    const dep = dependents[0];

    // Get dependent's own questions (record_type = 'dependent')
    const [questions] = await db.query(
      "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'dependent'",
      [depId]
    );

    const tq = questions[0] || {};

    // If dependent is missing some fields, fall back to main traveler's data
    const [mainTravelers] = await db.query(
      'SELECT * FROM travelers WHERE id = ?',
      [dep.traveler_id]
    );
    const mainT = mainTravelers[0] || {};

    const [mainQuestions] = await db.query(
      "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'",
      [dep.traveler_id]
    );
    const mainTq = mainQuestions[0] || {};

    // Dependent uses own personal data but falls back to main traveler for shared fields
    const mergedT = {
      ...dep,
      // Use dependent's own fields, fall back to main traveler for contact/address
      contact_number: dep.contact_number || mainT.contact_number,
      country_code: dep.country_code || mainT.country_code,
      email: dep.email || mainT.email,
      address_line_1: dep.address_line_1 || mainT.address_line_1,
      address_line_2: dep.address_line_2 || mainT.address_line_2,
      city: dep.city || mainT.city,
      state_province: dep.state_province || mainT.state_province,
      zip_code: dep.zip_code || mainT.zip_code,
      visa_center: dep.visa_center || mainT.visa_center,
      doc_date: dep.doc_date || mainT.doc_date,
    };

    // Dependent questions fall back to main traveler questions for travel/hotel data
    const mergedTq = {
      ...tq,
      travel_date_from: tq.travel_date_from || mainTq.travel_date_from,
      travel_date_to: tq.travel_date_to || mainTq.travel_date_to,
      hotel_name: tq.hotel_name || mainTq.hotel_name,
      hotel_address_1: tq.hotel_address_1 || mainTq.hotel_address_1,
      hotel_address_2: tq.hotel_address_2 || mainTq.hotel_address_2,
      hotel_city: tq.hotel_city || mainTq.hotel_city,
      hotel_state: tq.hotel_state || mainTq.hotel_state,
      hotel_zip: tq.hotel_zip || mainTq.hotel_zip,
      hotel_contact_number: tq.hotel_contact_number || mainTq.hotel_contact_number,
      inviting_person_first_name: tq.inviting_person_first_name || mainTq.inviting_person_first_name,
      inviting_person_surname: tq.inviting_person_surname || mainTq.inviting_person_surname,
      inviting_person_phone: tq.inviting_person_phone || mainTq.inviting_person_phone,
      inviting_person_phone_code: tq.inviting_person_phone_code || mainTq.inviting_person_phone_code,
      inviting_person_address_1: tq.inviting_person_address_1 || mainTq.inviting_person_address_1,
      inviting_person_address_2: tq.inviting_person_address_2 || mainTq.inviting_person_address_2,
      inviting_person_city: tq.inviting_person_city || mainTq.inviting_person_city,
      inviting_person_state: tq.inviting_person_state || mainTq.inviting_person_state,
      inviting_person_zip: tq.inviting_person_zip || mainTq.inviting_person_zip,
    };

    const formData = mapDbToForm(mergedT, mergedTq);

    let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    Object.keys(cssCache).forEach(k => delete cssCache[k]);

    html = replaceText(html, formData);
    html = handleCheckboxes(html, formData);
    html = addAutoFitScript(html);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── List dependents for a traveler ──

app.get('/dependents/:travelerId', async (req, res) => {
  try {
    const travelerId = parseInt(req.params.travelerId);
    const [rows] = await db.query(
      'SELECT id, traveler_id, first_name, last_name, gender, dob, passport_no, relationship_to_main FROM dependents WHERE traveler_id = ?',
      [travelerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List all Portugal travelers ──

app.get('/travelers', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, gender, dob, passport_no, nationality
       FROM travelers WHERE travel_country LIKE '%ortugal%'
       ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auto-fit: inject a script that shrinks overflowing text in the browser ──

function addAutoFitScript(html) {
  const script = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Find all text divs inside .c containers (form field boxes)
  document.querySelectorAll('.c .t').forEach(function(el) {
    if (!el.textContent.trim()) return;

    var container = el.closest('.c');
    if (!container) return;

    var containerRect = container.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();

    // Check if this text element overflows the container
    if (elRect.right > containerRect.right + 2) {
      // Allow wrapping to multiple lines instead of overflowing
      var availWidth = containerRect.right - elRect.left;
      if (availWidth > 20) {
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
        el.style.width = availWidth + 'px';
        el.style.lineHeight = '1.2';
      }
    }
  });

  // Also check text divs directly inside .pc (page container, not inside .c)
  document.querySelectorAll('.pc > .t').forEach(function(el) {
    if (!el.textContent.trim()) return;

    var page = el.closest('.pf');
    if (!page) return;

    var pageRect = page.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();

    if (elRect.right > pageRect.right + 2) {
      var availWidth = pageRect.right - elRect.left;
      if (availWidth > 20) {
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
        el.style.width = availWidth + 'px';
        el.style.lineHeight = '1.2';
      }
    }
  });
});
</script>`;

  // Insert before closing </body> or </html>
  if (html.includes('</body>')) {
    html = html.replace('</body>', script + '</body>');
  } else if (html.includes('</html>')) {
    html = html.replace('</html>', script + '</html>');
  } else {
    html += script;
  }

  return html;
}

// ── Health check ──

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// ── Start server ──

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Visa form filler API running on port ${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /health                  - Health check');
  console.log('  GET  /travelers               - List all Portugal travelers');
  console.log('  GET  /dependents/:travelerId  - List dependents for a traveler');
  console.log('  GET  /fill-form/:id           - Fill form for a traveler');
  console.log('  GET  /fill-form/dependent/:id - Fill form for a dependent');
  console.log('  POST /fill-form               - Fill form from JSON body');
});
