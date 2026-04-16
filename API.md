# API Reference

Base URL: `http://localhost:3000` (or wherever `PORT` is bound).

Supported countries: **portugal**, **italy**.

---

## Endpoints

### `GET /health`

Connection check.

```bash
curl http://localhost:3000/health
```
```json
{ "status": "ok", "db": "connected" }
```

---

### `GET /travelers`

List travelers whose `travel_country` matches the requested country.

| Query | Required | Default | Notes |
|---|---|---|---|
| `country` | no | `portugal` | `portugal` or `italy` |

```bash
curl 'http://localhost:3000/travelers?country=italy'
```
```json
[
  {
    "id": 93,
    "first_name": "LINTU MARY",
    "last_name": "THOMAS",
    "gender": "Female",
    "dob": "1988-07-03T18:30:00.000Z",
    "passport_no": "Z5167921",
    "nationality": "India"
  }
]
```

---

### `GET /dependents/:travelerId`

List dependents linked to a traveler.

```bash
curl http://localhost:3000/dependents/38
```

---

### `GET /fill-form/:country/:id`

Render the filled form as HTML for a traveler. Loads the traveler + their `traveler_questions` row from the DB, runs the country mapping pipeline, and returns HTML ready to open in a browser.

```bash
open 'http://localhost:3000/fill-form/portugal/38'
open 'http://localhost:3000/fill-form/italy/93'
```

| Path param | Notes |
|---|---|
| `country` | `portugal` or `italy`. Returns 400 if unknown. |
| `id` | Integer traveler ID. Returns 400 if not a positive int, 404 if not found. |

Response: `200 text/html` — the interactive form (click-to-edit, checkbox toggle, Save as PDF).

---

### `GET /fill-form/:country/dependent/:id`

Same as above but for a dependent. Dependent fields that are `null` fall back to the main traveler's row for shared context (contact info, hotel, travel dates, etc.).

```bash
open 'http://localhost:3000/fill-form/italy/dependent/210'
```

---

### `POST /fill-form/:country`

Render a form from a JSON body — no DB lookup. Useful for previewing custom data or testing.

```bash
curl -X POST 'http://localhost:3000/fill-form/italy' \
  -H 'content-type: application/json' \
  -d '{
    "surname": "TESTSURNAME",
    "first_name": "TESTFIRST",
    "dob": "01/01/2000",
    "sex": "female",
    "civil_status": "single",
    "purpose": "tourism",
    "num_entries": "multiple",
    "travel_doc_type": "ordinary",
    "residence": "yes",
    "cost_applicant": ["by_applicant", "cash", "pre_paid_accommodation", "pre_paid_transport"],
    "main_destination": "Italy",
    "first_entry": "Italy"
  }' > /tmp/preview.html && open /tmp/preview.html
```

`surname` is the only required field. Everything else is optional — unset fields stay at the template's empty placeholder.

Full body shape — all fields accepted by both countries:

| Field | Type | Notes |
|---|---|---|
| `surname` | string | **required** |
| `first_name` | string | |
| `dob` | string | `DD/MM/YYYY` |
| `place_of_birth` | string | |
| `country_of_birth` | string | Also covers "Issued by" for Portugal/Italy |
| `nationality` | string | |
| `passport_number` | string | |
| `date_of_issue` | string | `DD/MM/YYYY` |
| `valid_until` | string | `DD/MM/YYYY` |
| `telephone` | string | Include country-code prefix, e.g. `+44 7...` |
| `email` | string | |
| `home_address` | string | Single-line joined address |
| `occupation` | string | |
| `employer_name` | string | |
| `employer_address` | string | |
| `employer_telephone` | string | |
| `main_destination` | string | |
| `first_entry` | string | |
| `arrival_date` | string | `DD/MM/YYYY` |
| `departure_date` | string | `DD/MM/YYYY` |
| `hotel_name` | string | |
| `hotel_address` | string | |
| `hotel_telephone` | string | |
| `hotel_email` | string | |
| `residence_permit` | string | |
| `residence_valid_until` | string | `DD/MM/YYYY` |
| `sign_date` | string | `DD/MM/YYYY` |
| `place_date` | string | City where signed |
| `sex` | `"male"` \| `"female"` \| `"other"` | |
| `civil_status` | `"single"` \| `"married"` \| `"registered"` \| `"separated"` \| `"divorced"` \| `"widow"` \| `"other"` | |
| `travel_doc_type` | `"ordinary"` \| `"diplomatic"` \| `"service"` \| `"official"` \| `"special"` \| `"other"` | |
| `purpose` | `"tourism"` \| `"business"` \| `"visiting"` \| `"cultural"` \| `"sports"` \| `"official"` \| `"medical"` \| `"study"` \| `"airport_transit"` \| `"other"` | |
| `num_entries` | `"single"` \| `"two"` \| `"multiple"` | |
| `family_relation` | `"spouse"` \| `"child"` \| `"grandchild"` \| `"dependent"` \| `"registered"` \| `"other"` | |
| `fingerprints` | `"yes"` \| `"no"` | |
| `residence` | `"yes"` \| `"no"` | |
| `cost_applicant` | string[] | any of `"by_applicant"`, `"cash"`, `"travellers_cheques"`, `"credit_card"`, `"pre_paid_accommodation"`, `"pre_paid_transport"`, `"other"` |
| `cost_sponsor` | string[] | Portugal only: `"by_sponsor"`, `"referred_to_applicant"`, `"cash"`, `"accommodation"`, `"all_expenses"`, `"pre_paid_transport"`, `"other"`, `"other_specify"` |

**Italy-specific notes**:
- Italy template doesn't wire up `cost_sponsor.*`, `travel_doc_type.other`, `purpose.other`, or `family_relation.registered/other`. Setting them has no effect.
- Italy uses `□` (U+25A1); Portugal uses `☐` (U+2610). Both render the same visually.

---

## Backwards-compatibility aliases

Old Portugal-only URLs still work. They 301-redirect to the country-prefixed equivalents.

| Old | Redirects to |
|---|---|
| `GET /fill-form/:id` | `/fill-form/portugal/:id` |
| `GET /fill-form/dependent/:id` | `/fill-form/portugal/dependent/:id` |
| `POST /fill-form` | `/fill-form/portugal` (internal rewrite, no redirect) |
| `GET /travelers` (no `country`) | behaves as `country=portugal` |

---

## Error responses

| Status | Condition |
|---|---|
| `400` | Unknown country, missing required field (POST), invalid ID |
| `404` | Traveler or dependent ID not found |
| `500` | DB error or rendering failure |

All errors return `{ "error": "<message>" }`.

---

## Dumping mapped data for debugging

When a form looks wrong, inspect what the mapper produced:

```bash
node scripts/dump-form-data.js italy 1004
# writes data-italy-1004.json
```

The file contains:
- `raw.travelers` — full DB row
- `raw.traveler_questions` — full DB row
- `mapped` — object fed into the renderer (the same shape accepted by `POST /fill-form/:country`)

Copy `mapped` into a curl body to reproduce a specific traveler's render without DB access.
