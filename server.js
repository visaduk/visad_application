require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');

const COUNTRIES = require('./countries');
const { tagAllCheckboxDivs } = require('./lib/html-utils');
const { applyCheckboxes } = require('./lib/checkbox-handler');
const { mapDbToForm } = require('./lib/db-mapper');
const { addAutoFitScript } = require('./lib/autofit-script');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/libs', express.static(path.join(__dirname, 'node_modules')));

// Pre-load PDF-export libraries for inline injection (blob URLs can't load external scripts)
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

function getCountry(slug) {
  return COUNTRIES[String(slug || '').toLowerCase()];
}

// Pipeline: load template → text replacements → checkboxes → tag editable → inject script.
function renderForm(cfg, data) {
  let html = fs.readFileSync(cfg.templatePath, 'utf-8');
  html = cfg.applyTextReplacements(html, data);
  html = applyCheckboxes(html, data, cfg);
  html = tagAllCheckboxDivs(html);
  html = addAutoFitScript(html, {
    pdfFilenamePrefix: cfg.pdfFilenamePrefix,
    html2canvasJs: HTML2CANVAS_JS,
    jspdfJs: JSPDF_JS,
  });
  return html;
}

function sendForm(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

// ── Backwards-compatibility aliases (must be registered BEFORE the country-aware routes
// so they intercept URLs like /fill-form/dependent/45 before the country-aware route
// matches with country="dependent"). ──

app.get('/fill-form/dependent/:id', (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return next();
  res.redirect(301, `/fill-form/portugal/dependent/${id}`);
});
app.post('/fill-form', (req, res, next) => {
  req.url = '/fill-form/portugal';
  next();
});

// ── Form fill from JSON body ──

app.post('/fill-form/:country', (req, res) => {
  const cfg = getCountry(req.params.country);
  if (!cfg) return res.status(400).json({ error: `Unknown country: ${req.params.country}` });
  const data = req.body;
  if (!data || !data.surname) {
    return res.status(400).json({ error: 'Missing required field: surname' });
  }
  sendForm(res, renderForm(cfg, data));
});

// ── Form fill from DB by dependent ID ──

app.get('/fill-form/:country/dependent/:id', async (req, res) => {
  try {
    const cfg = getCountry(req.params.country);
    if (!cfg) return res.status(400).json({ error: `Unknown country: ${req.params.country}` });

    const depId = parseInt(req.params.id, 10);
    if (!Number.isInteger(depId) || depId <= 0) {
      return res.status(400).json({ error: 'Invalid dependent ID' });
    }
    const [dependents] = await db.query('SELECT * FROM dependents WHERE id = ?', [depId]);
    if (dependents.length === 0) {
      return res.status(404).json({ error: 'Dependent not found with ID: ' + depId });
    }
    const dep = dependents[0];

    const [questions] = await db.query(
      "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'dependent'",
      [depId]
    );
    const tq = questions[0] || {};

    const [mainTravelers] = await db.query('SELECT * FROM travelers WHERE id = ?', [dep.traveler_id]);
    const mainT = mainTravelers[0] || {};

    const [mainQuestions] = await db.query(
      "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'",
      [dep.traveler_id]
    );
    const mainTq = mainQuestions[0] || {};

    // Dependent uses its own personal data but inherits shared travel/contact info from the main traveler.
    const mergedT = {
      ...dep,
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

    const formData = mapDbToForm(mergedT, mergedTq, cfg);
    sendForm(res, renderForm(cfg, formData));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Form fill from DB by traveler ID ──

app.get('/fill-form/:country/:id', async (req, res) => {
  try {
    const cfg = getCountry(req.params.country);
    if (!cfg) return res.status(400).json({ error: `Unknown country: ${req.params.country}` });

    const travelerId = parseInt(req.params.id, 10);
    if (!Number.isInteger(travelerId) || travelerId <= 0) {
      return res.status(400).json({ error: 'Invalid traveler ID' });
    }
    const [travelers] = await db.query('SELECT * FROM travelers WHERE id = ?', [travelerId]);
    if (travelers.length === 0) {
      return res.status(404).json({ error: 'Traveler not found with ID: ' + travelerId });
    }
    const traveler = travelers[0];

    const [questions] = await db.query(
      "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'",
      [travelerId]
    );
    const tq = questions[0] || {};

    const formData = mapDbToForm(traveler, tq, cfg);
    sendForm(res, renderForm(cfg, formData));
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

// ── List travelers (filtered by destination country) ──

app.get('/travelers', async (req, res) => {
  try {
    const cfg = getCountry(req.query.country || 'portugal');
    if (!cfg) return res.status(400).json({ error: `Unknown country: ${req.query.country}` });
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, gender, dob, passport_no, nationality
       FROM travelers WHERE travel_country LIKE ?
       ORDER BY id`,
      [cfg.dbCountryFilter]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Backwards-compatibility alias for old GET /fill-form/:id ──
// Registered last so the country-aware /fill-form/:country/:id wins for known countries.
// Inside the handler we 404 when the param is non-numeric or matches a known country
// to avoid redirect loops (e.g. /fill-form/portugal would otherwise redirect to
// /fill-form/portugal/portugal).

app.get('/fill-form/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: `Unknown route: /fill-form/${req.params.id}` });
  }
  res.redirect(301, `/fill-form/portugal/${id}`);
});

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
  console.log('  GET  /health                                 - Health check');
  console.log('  GET  /travelers?country={portugal|italy}     - List travelers for a country');
  console.log('  GET  /dependents/:travelerId                 - List dependents for a traveler');
  console.log('  GET  /fill-form/:country/:id                 - Fill form for a traveler');
  console.log('  GET  /fill-form/:country/dependent/:id       - Fill form for a dependent');
  console.log('  POST /fill-form/:country                     - Fill form from JSON body');
  console.log('');
  console.log(`Registered countries: ${Object.keys(COUNTRIES).join(', ')}`);
});
