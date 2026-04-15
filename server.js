require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/libs', express.static(path.join(__dirname, 'node_modules')));

// Pre-load libraries for inline injection (blob URLs can't load external scripts)
const HTML2CANVAS_JS = fs.readFileSync(path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js'), 'utf-8');
const JSPDF_JS = fs.readFileSync(path.join(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js'), 'utf-8');

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

// Mark a div containing oldVal as editable (adds data-editable attribute)
function markDivEditable(html, oldVal, type) {
  const escaped = oldVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(<div )(class="t [^"]*">[^<]*${escaped})`, 'g');
  return html.replace(re, `$1data-editable="${type}" $2`);
}

// Inline SVG tick — replaces the Unicode ☑ glyph inside checkbox divs so we
// control stroke width (the "bold" knob) without touching neighbor layout.
const TICK_SVG = '<svg class="elfill-tick" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M3 8.5 L7 12.5 L13 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Tag all checkbox divs (containing ☐ or ☑) as editable, and swap any ticked
// ☑ glyph for the SVG tick so it renders with a thicker stroke.
function tagAllCheckboxDivs(html) {
  html = html.replace(
    /(<div )(class="t [^"]*">\s*[\u2610\u2611])/g,
    '$1data-editable="checkbox" $2'
  );
  html = html.replace(
    /(<div [^>]*data-editable="checkbox"[^>]*>\s*)\u2611/g,
    '$1' + TICK_SVG
  );
  return html;
}

// Wrap value in bold Cambria span
function bold(val) {
  return `<span style="font-family:Cambria,'Cambria Math',serif;font-weight:bold;">${val}</span>`;
}

function replaceText(html, data) {
  // Simple text replacements — mark editable BEFORE replacing
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
      html = markDivEditable(html, oldVal, 'text');
      html = html.replaceAll(oldVal, bold(data[field]));
    }
  }

  // country_of_birth also replaces "issued_by" since both are "SRI LANKA"
  if (data.country_of_birth) {
    html = markDivEditable(html, THARSHIGA_TEXT.country_of_birth, 'text');
    html = html.replaceAll(THARSHIGA_TEXT.country_of_birth, bold(data.country_of_birth));
  }

  // Anchor-based replacements (unique HTML patterns)
  if (data.first_entry) {
    html = html.replace(THARSHIGA_TEXT.first_entry, ` data-editable="text">${bold(data.first_entry)}</div>`);
  }
  if (data.place_date) {
    html = html.replace(THARSHIGA_TEXT.place_date, ` data-editable="text">${bold(data.place_date)}</div>`);
  }

  // Span-split replacements
  if (data.home_address) {
    html = markDivEditable(html, '107,', 'text');
    html = html.replace(THARSHIGA_SPAN.home_address.old, bold(data.home_address));
  }
  if (data.employer_name && data.employer_address) {
    html = markDivEditable(html, 'OKEHAMPTON ROAD POST OFFICE', 'text');
    html = html.replace(THARSHIGA_SPAN.employer.old, bold(`${data.employer_name},${data.employer_address}`));
  } else if (data.employer_name) {
    html = markDivEditable(html, 'OKEHAMPTON ROAD POST OFFICE', 'text');
    html = html.replace('OKEHAMPTON ROAD POST OFFICE', bold(data.employer_name));
  }
  if (data.main_destination) {
    html = markDivEditable(html, 'Portugal,', 'text');
    html = html.replace(THARSHIGA_SPAN.main_destination.old, bold(data.main_destination));
  }
  // Hotel phone + address are in ONE div
  const newPhone = data.hotel_telephone || '';
  const newAddr = data.hotel_address || '';
  html = markDivEditable(html, '+351', 'text');
  html = html.replace(
    THARSHIGA_SPAN.hotel_phone_and_address.old,
    `${bold(newPhone)}<span class="_ _13"></span><span class="ff8">${bold(newAddr)}</span>`
  );
  // Hotel email line
  if (data.hotel_email) {
    html = markDivEditable(html, 'Lisbon,reservas', 'text');
    html = html.replace(THARSHIGA_SPAN.hotel_email.old, bold(data.hotel_email));
  } else {
    html = html.replace(THARSHIGA_SPAN.hotel_email.old, '');
  }
  // Hotel name
  html = markDivEditable(html, 'Residencial do Areeiro', 'text');
  html = html.replace(THARSHIGA_SPAN.hotel_name.old, bold(data.hotel_name || ''));

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
  html = tagAllCheckboxDivs(html);
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
    html = tagAllCheckboxDivs(html);
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
    html = tagAllCheckboxDivs(html);
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
<style>
/* ── Editable field indicators ── */
[data-editable="text"] {
  transition: all 0.15s ease;
  border-radius: 2px;
  cursor: move;
}
[data-editable="text"]:hover {
  background: rgba(59, 130, 246, 0.06);
  outline: 1.5px dashed rgba(59, 130, 246, 0.5);
  outline-offset: 1px;
}
[data-editable="text"][contenteditable="true"] {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  border-radius: 2px;
  cursor: text;
  -webkit-user-select: text;
  user-select: text;
}
[data-editable="text"]::selection,
[data-editable="text"] *::selection {
  background: rgba(59, 130, 246, 0.25);
  color: inherit;
}
[data-editable="text"].dragging {
  opacity: 0.7;
  outline: 2px solid #3b82f6;
}

/* Checkbox hover & toggle */
[data-editable="checkbox"] {
  transition: all 0.1s ease;
  border-radius: 2px;
}
[data-editable="checkbox"] .elfill-tick {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  overflow: visible;
}
[data-editable="checkbox"]:hover {
  background: rgba(59, 130, 246, 0.08);
  outline: 1.5px dashed rgba(59, 130, 246, 0.5);
  outline-offset: 1px;
  cursor: pointer;
}

/* ── Toolbar ── */
#elfill-toolbar {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 99999;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
#elfill-toolbar .elfill-logo {
  font-weight: 700;
  font-size: 14px;
  color: #1e293b;
  letter-spacing: -0.3px;
  padding-right: 6px;
  border-right: 1px solid #e2e8f0;
  margin-right: 2px;
}
#elfill-toolbar button {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
  font-family: inherit;
}
#elfill-toolbar .save-btn {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 1px 3px rgba(59,130,246,0.3);
}
#elfill-toolbar .save-btn:hover {
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(59,130,246,0.4);
  transform: translateY(-1px);
}
#elfill-toolbar .save-btn:active {
  transform: translateY(0);
}
#elfill-toolbar .reset-btn {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
#elfill-toolbar .reset-btn:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}
#elfill-toolbar .edit-hint {
  color: #94a3b8;
  font-size: 11px;
  max-width: 140px;
  line-height: 1.3;
}
#elfill-toolbar .addtext-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}
#elfill-toolbar .addtext-btn:hover {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}
#elfill-toolbar .addtext-btn.active {
  background: #0ea5e9;
  color: #fff;
  border-color: #0284c7;
  box-shadow: 0 1px 3px rgba(14,165,233,0.3);
}

/* Freeform text cursor when add-text mode is active */
.elfill-addtext-mode .pc {
  cursor: crosshair !important;
}
.elfill-addtext-mode .pc * {
  cursor: crosshair !important;
}
/* Freeform added text */
.elfill-added {
  position: absolute;
  z-index: 10;
  white-space: pre-wrap;
  cursor: move;
  min-width: 20px;
  min-height: 12px;
  transition: outline 0.15s ease;
}
.elfill-added:hover {
  outline: 1.5px dashed #0ea5e9;
  outline-offset: 1px;
}
.elfill-added[contenteditable="true"] {
  outline: 2px solid #0ea5e9;
  outline-offset: 1px;
  background: rgba(14, 165, 233, 0.06);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  cursor: text;
}
.elfill-added.dragging {
  opacity: 0.7;
  outline: 2px solid #0ea5e9;
}

/* ── Format bar (appears near selected freeform text) ── */
#elfill-formatbar {
  position: fixed;
  z-index: 100000;
  background: #1e293b;
  border-radius: 8px;
  padding: 4px 6px;
  display: none;
  gap: 2px;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#elfill-formatbar.show { display: flex; }
#elfill-formatbar button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
  font-family: Georgia, serif;
}
#elfill-formatbar button:hover { background: #334155; color: #fff; }
#elfill-formatbar button.active { background: #3b82f6; color: #fff; }
#elfill-formatbar .fmt-sep {
  width: 1px;
  height: 18px;
  background: #475569;
  margin: 0 3px;
}
#elfill-formatbar select {
  background: #334155;
  color: #e2e8f0;
  border: none;
  border-radius: 5px;
  padding: 4px 6px;
  font-size: 11px;
  cursor: pointer;
  outline: none;
}
#elfill-formatbar select:hover { background: #475569; }
#elfill-formatbar .fmt-delete {
  color: #f87171 !important;
}
#elfill-formatbar .fmt-delete:hover {
  background: #dc2626 !important;
  color: #fff !important;
}

/* ── Loading overlay ── */
#elfill-loading {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 100001;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#elfill-loading.show { display: flex; }
#elfill-loading .spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: elfill-spin 0.8s linear infinite;
}
@keyframes elfill-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
#elfill-loading .loading-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
#elfill-loading .loading-progress {
  color: #94a3b8;
  font-size: 13px;
}

/* ── Toast notification ── */
#elfill-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  z-index: 99999;
  background: #1e293b;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}
#elfill-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Hide everything edit-related when printing ── */
@media print {
  #elfill-toolbar { display: none !important; }
  #elfill-toast { display: none !important; }
  [data-editable] { outline: none !important; background: none !important; box-shadow: none !important; }
  [data-editable]:hover { outline: none !important; background: none !important; transform: none !important; }
  [data-editable][contenteditable] { outline: none !important; background: none !important; box-shadow: none !important; }
  .elfill-added { outline: none !important; background: none !important; box-shadow: none !important; }
  #elfill-formatbar { display: none !important; }
  #elfill-loading { display: none !important; }
  .elfill-added:hover { outline: none !important; }
  .elfill-added[contenteditable] { outline: none !important; background: none !important; box-shadow: none !important; }
}
</style>
<script>
document.addEventListener('DOMContentLoaded', function() {

  // ── Auto-fit: wrap overflowing text ──
  document.querySelectorAll('.c .t').forEach(function(el) {
    if (!el.textContent.trim()) return;
    var container = el.closest('.c');
    if (!container) return;
    var cRect = container.getBoundingClientRect();
    var eRect = el.getBoundingClientRect();
    if (eRect.right > cRect.right + 2) {
      var avail = cRect.right - eRect.left;
      if (avail > 20) {
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
        el.style.width = avail + 'px';
        el.style.lineHeight = '1.2';
      }
    }
  });
  document.querySelectorAll('.pc > .t').forEach(function(el) {
    if (!el.textContent.trim()) return;
    var page = el.closest('.pf');
    if (!page) return;
    var pRect = page.getBoundingClientRect();
    var eRect = el.getBoundingClientRect();
    if (eRect.right > pRect.right + 2) {
      var avail = pRect.right - eRect.left;
      if (avail > 20) {
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
        el.style.width = avail + 'px';
        el.style.lineHeight = '1.2';
      }
    }
  });

  // ── Editable text fields (drag + format + edit) ──
  var originals = new Map();

  document.querySelectorAll('[data-editable="text"]').forEach(function(el) {
    originals.set(el, el.innerHTML);

    var isDragging = false, hasDragged = false, dragStartX, dragStartY, origLeft, origBottom;
    var pc = el.closest('.pc');

    // ── Mousedown: start drag ──
    el.addEventListener('mousedown', function(e) {
      if (el.contentEditable === 'true') return;
      if (e.target.closest('#elfill-formatbar')) return;
      isDragging = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      // Get current position from computed style
      var cs = window.getComputedStyle(el);
      origLeft = parseFloat(cs.left) || 0;
      origBottom = parseFloat(cs.bottom) || 0;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true;
        el.classList.add('dragging');
        var pcRect = pc ? pc.getBoundingClientRect() : null;
        var scaleX = pcRect ? pcRect.width / pc.offsetWidth : 1;
        var scaleY = pcRect ? pcRect.height / pc.offsetHeight : 1;
        el.style.left = (origLeft + dx / scaleX) + 'px';
        el.style.bottom = (origBottom - dy / scaleY) + 'px';
      }
    });

    document.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('dragging');
    });

    // ── Single click: show format bar (if not dragged) ──
    el.addEventListener('click', function(e) {
      if (hasDragged) { hasDragged = false; return; }
      if (el.contentEditable === 'true') return;
      showFormatBar(el);
    });

    // ── Double-click: edit text ──
    el.addEventListener('dblclick', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Clear any browser word selection first
      window.getSelection().removeAllRanges();
      hideFormatBar();
      el._origWS = el.style.whiteSpace || '';
      el.style.whiteSpace = 'pre-wrap';
      el.contentEditable = 'true';
      el.focus();
      // Select all content cleanly after a tick
      setTimeout(function() {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    });

    // ── Blur: stop editing ──
    el.addEventListener('blur', function() {
      el.contentEditable = 'false';
      el.style.whiteSpace = el._origWS || '';
      if (el.innerHTML !== originals.get(el)) {
        showToast('Field updated');
      }
    });

    // ── Keyboard ──
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.innerHTML = originals.get(el); el.blur(); }
    });
  });

  // ── Editable checkboxes ──
  var TICK_SVG = ${JSON.stringify(TICK_SVG)};
  document.querySelectorAll('[data-editable="checkbox"]').forEach(function(el) {
    originals.set(el, el.innerHTML);
    el.style.cursor = 'pointer';

    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var tick = el.querySelector('.elfill-tick');
      if (tick) {
        // Currently checked (SVG tick) — uncheck back to ☐
        tick.outerHTML = '\u2610';
      } else if (el.innerHTML.indexOf('\u2610') !== -1) {
        // Currently unchecked — replace ☐ with SVG tick
        el.innerHTML = el.innerHTML.replace('\u2610', TICK_SVG);
      } else if (el.innerHTML.indexOf('\u2611') !== -1) {
        // Fallback: Unicode ☑ leaked through — replace it with SVG tick
        el.innerHTML = el.innerHTML.replace('\u2611', TICK_SVG);
      }
    });
  });

  // ── Toast notification ──
  var toast = document.createElement('div');
  toast.id = 'elfill-toast';
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2000);
  }

  // ── Toolbar ──
  var toolbar = document.createElement('div');
  toolbar.id = 'elfill-toolbar';
  toolbar.innerHTML =
    '<span class="elfill-logo">elfill</span>' +
    '<span class="edit-hint">Click any value to edit</span>' +
    '<button class="addtext-btn" id="elfill-addtext">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M12 5v14M5 12h14"/></svg>' +
      'Add Text</button>' +
    '<button class="save-btn" id="elfill-save">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M6 9l6 6 6-6"/></svg>' +
      'Save as PDF</button>' +
    '<button class="reset-btn" id="elfill-reset">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
      'Reset</button>';
  document.body.appendChild(toolbar);

  // ── Loading overlay ──
  var loading = document.createElement('div');
  loading.id = 'elfill-loading';
  loading.innerHTML =
    '<div class="spinner"></div>' +
    '<div class="loading-text">Generating PDF</div>' +
    '<div class="loading-progress" id="elfill-progress">Loading libraries...</div>';
  document.body.appendChild(loading);

  function showLoading(msg) {
    document.getElementById('elfill-progress').textContent = msg;
    loading.classList.add('show');
  }
  function hideLoading() {
    loading.classList.remove('show');
  }

  document.getElementById('elfill-save').addEventListener('click', async function() {
    var btn = this;
    btn.disabled = true;
    showLoading('Preparing PDF...');

    try {
      // Hide toolbar and edit indicators for capture
      toolbar.style.display = 'none';
      toast.style.display = 'none';
      formatBar.classList.remove('show');
      var pages = document.querySelectorAll('.pf');
      var pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [pages[0].offsetWidth, pages[0].offsetHeight]
      });

      // Hide ALL overlays and edit indicators during capture
      var capStyle = document.createElement('style');
      capStyle.id = 'elfill-capture-hide';
      capStyle.textContent = '[data-editable],[data-editable]:hover,.elfill-added,.elfill-added:hover{outline:none!important;box-shadow:none!important;background:transparent!important;}';
      document.head.appendChild(capStyle);
      loading.classList.remove('show');
      toolbar.style.display = 'none';
      toast.style.display = 'none';
      formatBar.classList.remove('show');

      // Force all pdf2htmlEX pages visible (they hide .pc without .opened class)
      var allPc = document.querySelectorAll('.pc');
      allPc.forEach(function(pc) { pc.classList.add('opened'); });

      for (var i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage([pages[i].offsetWidth, pages[i].offsetHeight]);

        // Scroll page into view so it renders for html2canvas
        pages[i].scrollIntoView();
        await new Promise(function(r) { setTimeout(r, 100); });

        var canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: -window.scrollY,
          ignoreElements: function(el) {
            return el.id === 'elfill-toolbar' || el.id === 'elfill-toast' ||
                   el.id === 'elfill-formatbar' || el.id === 'elfill-loading';
          }
        });

        var imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pages[i].offsetWidth, pages[i].offsetHeight);
      }

      showLoading('Downloading PDF...');

      // Download the PDF file
      pdf.save('visa-application.pdf');

      hideLoading();
      showToast('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      hideLoading();
      showToast('PDF failed — falling back to print');
      window.print();
    } finally {
      // Restore toolbar and styles
      toolbar.style.display = 'flex';
      toast.style.display = '';
      var hideStyle = document.getElementById('elfill-capture-hide');
      if (hideStyle) hideStyle.remove();
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M6 9l6 6 6-6"/></svg>Save as PDF';
    }
  });

  document.getElementById('elfill-reset').addEventListener('click', function() {
    if (!confirm('Reset all changes to original values?')) return;
    originals.forEach(function(html, el) {
      el.innerHTML = html;
      el.contentEditable = 'false';
    });
    // Remove all freeform-added text
    document.querySelectorAll('.elfill-added').forEach(function(el) { el.remove(); });
    showToast('All changes reverted');
  });

  // ── Format bar ──
  var formatBar = document.createElement('div');
  formatBar.id = 'elfill-formatbar';
  formatBar.innerHTML =
    '<button id="fmt-bold" title="Bold (Ctrl+B)"><b>B</b></button>' +
    '<button id="fmt-italic" title="Italic (Ctrl+I)"><i>I</i></button>' +
    '<button id="fmt-underline" title="Underline (Ctrl+U)"><u>U</u></button>' +
    '<div class="fmt-sep"></div>' +
    '<select id="fmt-size" title="Font size">' +
      '<option value="20">Small</option>' +
      '<option value="26">Medium</option>' +
      '<option value="30" selected>Normal</option>' +
      '<option value="38">Large</option>' +
      '<option value="48">XL</option>' +
    '</select>' +
    '<div class="fmt-sep"></div>' +
    '<button id="fmt-delete" class="fmt-delete" title="Delete">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
    '</button>';
  document.body.appendChild(formatBar);

  var activeEl = null;

  function showFormatBar(el) {
    activeEl = el;
    var rect = el.getBoundingClientRect();
    formatBar.style.left = rect.left + 'px';
    formatBar.style.top = (rect.top - 40) + 'px';
    formatBar.classList.add('show');
    // Update button states
    var cs = window.getComputedStyle(el);
    document.getElementById('fmt-bold').classList.toggle('active', cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 700);
    document.getElementById('fmt-italic').classList.toggle('active', cs.fontStyle === 'italic');
    document.getElementById('fmt-underline').classList.toggle('active', cs.textDecoration.includes('underline'));
  }

  function hideFormatBar() {
    formatBar.classList.remove('show');
    activeEl = null;
  }

  document.getElementById('fmt-bold').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    var isBold = window.getComputedStyle(activeEl).fontWeight >= 700;
    activeEl.style.fontWeight = isBold ? 'normal' : 'bold';
    this.classList.toggle('active');
  });

  document.getElementById('fmt-italic').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    var isItalic = window.getComputedStyle(activeEl).fontStyle === 'italic';
    activeEl.style.fontStyle = isItalic ? 'normal' : 'italic';
    this.classList.toggle('active');
  });

  document.getElementById('fmt-underline').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    var isUnder = window.getComputedStyle(activeEl).textDecoration.includes('underline');
    activeEl.style.textDecoration = isUnder ? 'none' : 'underline';
    this.classList.toggle('active');
  });

  document.getElementById('fmt-size').addEventListener('change', function(e) {
    if (!activeEl) return;
    activeEl.style.fontSize = this.value + 'px';
  });

  document.getElementById('fmt-delete').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    activeEl.remove();
    hideFormatBar();
    showToast('Text removed');
  });

  // Hide format bar when clicking elsewhere
  document.addEventListener('mousedown', function(e) {
    if (e.target.closest('#elfill-formatbar') || e.target.closest('.elfill-added')) return;
    hideFormatBar();
  });

  // ── Add Text mode ──
  var addTextMode = false;
  var addTextBtn = document.getElementById('elfill-addtext');

  addTextBtn.addEventListener('click', function() {
    addTextMode = !addTextMode;
    addTextBtn.classList.toggle('active', addTextMode);
    document.body.classList.toggle('elfill-addtext-mode', addTextMode);
    if (addTextMode) {
      showToast('Click anywhere on the form to add text');
    }
  });

  function setupFreeformEl(newEl, pc) {
    // ── Drag to move ──
    var isDragging = false, dragStartX, dragStartY, origLeft, origBottom;

    newEl.addEventListener('mousedown', function(e) {
      if (newEl.contentEditable === 'true') return; // don't drag while editing
      if (e.target.closest('#elfill-formatbar')) return;
      isDragging = true;
      newEl.classList.add('dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      origLeft = parseFloat(newEl.style.left) || 0;
      origBottom = parseFloat(newEl.style.bottom) || 0;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      // Account for page scale — the pc container may be scaled
      var pcRect = pc.getBoundingClientRect();
      var scaleX = pcRect.width / pc.offsetWidth;
      var scaleY = pcRect.height / pc.offsetHeight;
      newEl.style.left = (origLeft + dx / scaleX) + 'px';
      newEl.style.bottom = (origBottom - dy / scaleY) + 'px';
    });

    document.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      newEl.classList.remove('dragging');
    });

    // ── Double-click to edit text ──
    newEl.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      newEl.contentEditable = 'true';
      newEl.focus();
      var range = document.createRange();
      range.selectNodeContents(newEl);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // ── Single click: show format bar ──
    newEl.addEventListener('click', function(e) {
      e.stopPropagation();
      if (newEl.contentEditable !== 'true') {
        showFormatBar(newEl);
      }
    });

    // ── Blur: stop editing ──
    newEl.addEventListener('blur', function() {
      if (!newEl.textContent.trim()) {
        newEl.remove();
        hideFormatBar();
      } else {
        newEl.contentEditable = 'false';
        showToast('Text updated');
      }
    });

    // ── Keyboard shortcuts ──
    newEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); newEl.blur(); }
      if (e.key === 'Escape') { newEl.remove(); hideFormatBar(); }
    });
  }

  // Listen for clicks on page containers when in add-text mode
  document.querySelectorAll('.pc').forEach(function(pc) {
    pc.addEventListener('click', function(e) {
      if (!addTextMode) return;
      if (e.target.closest('[data-editable]') || e.target.closest('.elfill-added')) return;

      var pcRect = pc.getBoundingClientRect();
      var scaleX = pcRect.width / pc.offsetWidth;
      var scaleY = pcRect.height / pc.offsetHeight;
      var clickX = (e.clientX - pcRect.left) / scaleX;
      var clickY = (e.clientY - pcRect.top) / scaleY;
      var pcHeight = pc.offsetHeight;
      var bottomPos = pcHeight - clickY;

      var newEl = document.createElement('div');
      newEl.className = 'elfill-added';
      newEl.style.cssText =
        'left:' + clickX + 'px;' +
        'bottom:' + bottomPos + 'px;' +
        'font-family:ff6;' +
        'font-size:30px;' +
        'line-height:0.915527;' +
        'transform:matrix(0.375,0,0,0.375,0,0);' +
        'transform-origin:0 100%;' +
        'color:#000;';
      newEl.contentEditable = 'true';
      newEl.setAttribute('data-freeform', 'true');
      pc.appendChild(newEl);
      newEl.focus();

      setupFreeformEl(newEl, pc);

      // Turn off add-text mode after placing
      addTextMode = false;
      addTextBtn.classList.remove('active');
      document.body.classList.remove('elfill-addtext-mode');
    });
  });

});
</script>`;

  // Inline html2canvas and jspdf so they work from blob URLs
  const libs = `<script>${HTML2CANVAS_JS}</script><script>${JSPDF_JS}</script>`;

  // Insert before closing </body> or </html>
  if (html.includes('</body>')) {
    html = html.replace('</body>', libs + script + '</body>');
  } else if (html.includes('</html>')) {
    html = html.replace('</html>', libs + script + '</html>');
  } else {
    html += libs + script;
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
