# Zafah — الزفة · Google Sheets Outreach & CSV Import Plan

A lightweight workflow for managing venue **outreach** and preparing **real venue
data** for import into Supabase — **without** connecting Google Sheets to the app.

## Ground rules

- **Supabase is the source of truth.** The app reads only from Supabase.
- **Google Sheets is a scratchpad** for outreach tracking + data prep. It is never
  queried by the app and never holds live data.
- **No Google API, no API keys, no integration.** The only bridge is a manual
  *Download as CSV → run the existing import script* step.
- Every imported venue lands as **`pending_review` / `unverified`** and is invisible
  publicly until an admin approves it in `/admin`.
- The importer (`scripts/import-venues.mjs`) uses the **public anon key already in
  `.env.local`** — no new secrets, no service-role key.

---

## 1. Recommended sheet column structure

Use **one sheet (tab)** with two groups of columns.

### Group A — Import columns (MUST match the importer exactly)

These header names and their meaning come straight from `scripts/venues-template.csv`
and `import-venues.mjs`. Keep the **names exactly** as below (case-sensitive). Order
is recommended but not required — the importer matches by header name, not position.

| Column | Notes | Example |
|---|---|---|
| `name` | **Required** | Whispering Palms Garden |
| `type` | Garden / Hotel / Rooftop / Villa / Hall … (keep consistent) | Garden |
| `city` | **Required** | New Cairo |
| `area` | Neighborhood | Fifth Settlement |
| `address` | Street address | 123 Example St |
| `google_maps_link` | Full maps URL | https://maps.google.com/?q=… |
| `official_website` | URL or blank | https://example.com |
| `social_link` | Instagram/FB URL or blank | https://instagram.com/example |
| `owner_phone` | E.164 format | +201000000000 |
| `owner_whatsapp` | E.164 format | +201000000000 |
| `owner_email` | | owner@example.com |
| `capacityMin` | **Digits only**, no commas | 100 |
| `capacityMax` | **Digits only**, no commas | 400 |
| `indoorOutdoor` | `Indoor` / `Outdoor` / `Both` | Outdoor |
| `startingPrice` | **Digits only** — no commas, no "EGP" | 80000 |
| `catering` | `true` / `false` (lowercase) | true |
| `parking` | `true` / `false` | true |
| `bridalRoom` | `true` / `false` | true |
| `dj` | `true` / `false` | true |
| `decoration` | `true` / `false` | false |
| `kidsArea` | `true` / `false` | true |
| `ac` | `true` / `false` | false |
| `valet` | `true` / `false` | true |
| `suitableFor` | **Pipe-separated** `\|` | Wedding\|Engagement |
| `description` | Free text | An open-air garden venue. |
| `images` | **Pipe-separated** `\|` URLs | https://…\|https://… |

> **Formatting rules that matter**
> - Numbers: plain digits only. `80000`, never `80,000` or `80000 EGP`.
> - Booleans: lowercase `true` / `false`. Anything else = `false`.
> - Multi-value fields (`suitableFor`, `images`): separate with `|` (pipe), **not** commas.
> - Minimum to import a row: **`name` + `city`**. Rows missing either are skipped.

### Group B — Outreach tracking columns (ignored by the importer)

Add these **after** the import columns. The importer doesn't recognize the names, so
they're automatically dropped on import — they exist only for you.

| Column | Purpose |
|---|---|
| `outreach_status` | Where the relationship stands (see §2) |
| `import_status` | Where the data is in the pipeline (see §2) |
| `date_first_contacted` | YYYY-MM-DD |
| `date_last_contacted` | YYYY-MM-DD |
| `contact_channel` | WhatsApp / Phone / Instagram / Email / In-person |
| `follow_up_date` | When to nudge again |
| `lead_source` | Where you found them (referral, Maps, IG…) |
| `dup_check` | Duplicate flag formula (see §4) |
| `imported_at` | Date you ran the import for this row |
| `notes` | Anything else |

---

## 2. Status values

Keep **two** small status columns — one for the *relationship*, one for the *data*.

### `outreach_status` — the conversation

| Value | Meaning |
|---|---|
| `Not Contacted` | In the list, not yet reached out to |
| `Contacted` | You messaged/called; awaiting reply |
| `Interested` | They want to be listed |
| `Not Interested` | Declined for now |
| `Do Not Contact` | Opted out — **never message again** |

### `import_status` — the data pipeline

| Value | Meaning |
|---|---|
| `Draft` | Data incomplete / unverified |
| `Ready` | Complete + validated, ready to export & import |
| `Imported` | Inserted into Supabase as `pending_review` ("registered") |
| `Approved` | Admin approved it in `/admin` → now live in the app |

Mapping to your wording: **contacted** = `outreach_status: Contacted`,
**interested** = `outreach_status: Interested`, **registered** =
`import_status: Imported` (and `Approved` once it's live).

---

## 3. CSV import format

The importer reads a standard CSV whose **header row** uses the Group A names above.
The reference template is **`scripts/venues-template.csv`**:

```
name,type,city,area,address,google_maps_link,official_website,social_link,owner_phone,owner_whatsapp,owner_email,capacityMin,capacityMax,indoorOutdoor,startingPrice,catering,parking,bridalRoom,dj,decoration,kidsArea,ac,valet,suitableFor,description,images
```

A data row example:

```
Whispering Palms Garden,Garden,New Cairo,Fifth Settlement,,,,,+201000000000,+201000000000,owner@example.com,100,400,Outdoor,80000,true,true,true,true,false,true,false,true,Wedding|Engagement,An open-air garden venue.,https://img1|https://img2
```

Group B columns may be present in the file — they're ignored. (Cleaner option:
export only Group A; see §4.)

---

## 4. Export → import steps

1. **Validate in the sheet.** Confirm rows you want to import have
   `import_status = Ready` and `dup_check = OK`.
2. **Isolate the rows to import.** Two options:
   - *Simple:* `Data → Create a filter`, filter `import_status = Ready`, then
     `File → Download → Comma-separated values (.csv)`. Extra columns get ignored on import.
   - *Cleanest (recommended):* keep a second tab named `import_ready` containing
     **only the 26 Group A columns**. Copy the Ready rows into it, then download
     *that tab* as CSV. This guarantees a tidy file and avoids re-importing old rows.
3. **Save the file** as `scripts/venues.csv` (or any path).
4. **Confirm credentials.** `.env.local` already has `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` — nothing to add.
5. **Run the import** from the `venuefinder/` folder:
   ```
   node scripts/import-venues.mjs scripts/venues.csv
   ```
   It prints `Imported N venues as pending_review.`
6. **Review & approve** each venue in `/admin`. Nothing is public until you approve it.
7. **Update the sheet:** set `import_status = Imported` and `imported_at = today` for
   the rows you just imported (set `Approved` after you approve them in `/admin`).

---

## 5. How to avoid duplicates

The importer **does not deduplicate** — it inserts every valid row as-is. Dedup is
your responsibility, at three layers:

**A. Inside the sheet (before export).** Add a `dup_check` formula. For a name in
column A and phone in column I (adjust letters to your layout):

```
=IF(OR(COUNTIF($A$2:$A,$A2)>1, AND($I2<>"",COUNTIF($I$2:$I,$I2)>1)),"DUP","OK")
```

Resolve every `DUP` before importing.

**B. In the pipeline (most important).** Only ever export rows with
`import_status = Ready`. The moment an import succeeds, flip those rows to
`Imported`. Because you never export `Imported`/`Approved` rows again, you can't
double-import them. **Never re-export the whole sheet.**

**C. In Supabase (safety net).** After importing, spot-check for accidental
duplicates by name (run in Supabase SQL editor):

```sql
select lower(name) as venue, count(*)
from venues
group by lower(name)
having count(*) > 1
order by count(*) desc;
```

If a true duplicate slipped through, delete the extra **pending** row in `/admin`
before approving.

---

## 6. How to mark venues as contacted / interested / registered

All in the sheet — no app interaction needed until import:

| When… | Do this in the row |
|---|---|
| You reach out | `outreach_status → Contacted`; set `date_first_contacted`, `contact_channel` |
| You follow up | update `date_last_contacted`, set `follow_up_date` |
| They say yes | `outreach_status → Interested` |
| They decline / opt out | `Not Interested` or `Do Not Contact` |
| Their data is complete | `import_status → Ready`, confirm `dup_check = OK` |
| You import them (**registered**) | `import_status → Imported`, set `imported_at` |
| You approve them in `/admin` | `import_status → Approved` (now live) |

---

## What this plan deliberately does NOT do

- ❌ No Google Sheets ↔ app live connection.
- ❌ No Google API, OAuth, service account, or API keys.
- ❌ Sheets is not a database — Supabase stays the single source of truth.
- ✅ The only data path is: **manual CSV download → existing `import-venues.mjs`
  → `pending_review` → admin approval.**
