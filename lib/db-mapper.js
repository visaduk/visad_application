// Country-agnostic mapper from DB rows (travelers + traveler_questions) to a
// normalized form-data object. Country-specific defaults are pulled from
// `cfg.defaults`; an optional `cfg.mapDbToFormOverride(data, t, tq)` hook lets
// a country tweak the result before nulls are stripped.

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatShareCode(code) {
  if (!code) return null;
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
  const parts = [
    tq.inviting_person_address_1,
    tq.inviting_person_address_2,
    tq.inviting_person_city,
    tq.inviting_person_state,
    tq.inviting_person_zip,
  ].filter(v => v && v !== 'N/A');
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildInvitingPhone(tq) {
  if (!tq.inviting_person_phone || tq.inviting_person_phone === 'N/A') return null;
  const code = tq.inviting_person_phone_code || '44';
  return `+${code} ${tq.inviting_person_phone}`;
}

function mapDbToForm(t, tq, cfg) {
  const defaults = cfg.defaults || {};

  const address = [t.address_line_1, t.address_line_2, t.city, t.state_province, t.zip_code]
    .filter(Boolean).join(', ');

  const employerAddr = [tq.company_address_1, tq.company_city, tq.company_zip]
    .filter(Boolean).join(', ');

  const hotelParts = [tq.hotel_address_1];
  if (tq.hotel_city && tq.hotel_address_1 && !tq.hotel_address_1.includes(tq.hotel_city)) {
    hotelParts.push(tq.hotel_city);
  }
  if (tq.hotel_zip && tq.hotel_address_1 && !tq.hotel_address_1.includes(tq.hotel_zip)) {
    hotelParts.push(tq.hotel_zip);
  }
  const hotelAddr = hotelParts.filter(Boolean).join(', ');

  let sex = null;
  if (t.gender) {
    const g = t.gender.toLowerCase();
    if (g === 'male') sex = 'male';
    else if (g === 'female') sex = 'female';
    else sex = 'other';
  }

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

  let fingerprints = null;
  if (tq.fingerprints_taken) {
    fingerprints = tq.fingerprints_taken.toLowerCase() === 'yes' ? 'yes' : 'no';
  }

  let telephone = null;
  if (t.contact_number) {
    const code = t.country_code || '44';
    telephone = `+${code} ${t.contact_number}`;
  }

  const nationalityUpper = t.nationality ? t.nationality.toUpperCase() : null;
  let nationality = null;
  if (nationalityUpper) {
    if (nationalityUpper.endsWith('AN') || nationalityUpper.endsWith('SH') || nationalityUpper.endsWith('SE') || nationalityUpper.endsWith('CH')) {
      nationality = nationalityUpper;
    } else if (nationalityUpper === 'INDIA') {
      nationality = 'INDIAN';
    } else {
      nationality = nationalityUpper;
    }
  }

  const data = {
    surname:               t.last_name ? t.last_name.toUpperCase() : null,
    first_name:            t.first_name ? t.first_name.toUpperCase() : null,
    dob:                   formatDate(t.dob),
    place_of_birth:        t.place_of_birth ? t.place_of_birth.toUpperCase() : null,
    country_of_birth:      t.country_of_birth ? t.country_of_birth.toUpperCase() : null,
    nationality:           nationality,
    passport_number:       t.passport_no,
    date_of_issue:         formatDate(t.passport_issue),
    valid_until:           formatDate(t.passport_expire),
    telephone:             telephone,
    email:                 t.email,
    home_address:          address,
    occupation:            tq.occupation_title ? tq.occupation_title.toUpperCase() : null,
    employer_name:         tq.company_name ? tq.company_name.toUpperCase() : null,
    employer_address:      employerAddr ? employerAddr.toUpperCase() : null,
    employer_telephone:    tq.company_phone || null,
    main_destination:      defaults.main_destination || null,
    first_entry:           defaults.first_entry || null,
    arrival_date:          formatDate(tq.travel_date_from),
    departure_date:        formatDate(tq.travel_date_to),
    hotel_name:            tq.hotel_name || buildInvitingName(tq) || null,
    hotel_address:         hotelAddr || buildInvitingAddress(tq) || null,
    hotel_telephone:       tq.hotel_contact_number || buildInvitingPhone(tq) || null,
    residence_permit:      formatShareCode(tq.share_code),
    residence_valid_until: formatDate(tq.evisa_expiry_date),
    sign_date:             formatDate(t.doc_date) || null,
    place_date:            t.visa_center || null,
    sex:                   sex,
    civil_status:          civil_status,
    travel_doc_type:       defaults.travel_doc_type || null,
    purpose:               defaults.purpose || null,
    num_entries:           defaults.num_entries || null,
    fingerprints:          fingerprints,
    residence:             defaults.residence || null,
    cost_applicant:        defaults.cost_applicant || null,
  };

  const out = cfg.mapDbToFormOverride ? cfg.mapDbToFormOverride(data, t, tq) : data;
  return Object.fromEntries(Object.entries(out).filter(([_, v]) => v !== null));
}

module.exports = {
  mapDbToForm,
  formatDate,
  formatShareCode,
  buildInvitingName,
  buildInvitingAddress,
  buildInvitingPhone,
};
