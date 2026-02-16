# Services Module – Development Plan (Bike, Car, E-bike, E-car)

This document plans the full development of the **Services** module using **4 separate templates** (Bike, Car, E-bike, E-car) with **direct access** to each, so users can manage each vehicle type separately. The plan is split across three subscription tiers (**Premium**, **Premium Plus**, **Premium Plus Plus**) and includes **all possible future features** for roadmap and prioritisation.

---

## 1. Overview

### 1.1 Four templates (not one combined module)

We provide **4 distinct templates** instead of one “Services” screen with tabs:

| Template | Route (example) | Purpose |
|----------|------------------|---------|
| **Bike**  | `/services/bike`  | Direct access to bike services only; list, add, edit, delete; bike-specific presets and fields. |
| **Car**   | `/services/car`  | Direct access to car services only; car-specific presets and fields. |
| **E-bike**| `/services/ebike`| Direct access to e-bike services only; e-bike-specific (e.g. battery) fields. |
| **E-car** | `/services/ecar` | Direct access to e-car services only; e-car-specific (e.g. battery) fields. |

**Benefits of 4 templates:**
- **Direct access** – User goes straight to Bike or Car or E-bike or E-car (dashboard cards, menu, or URLs).
- **Separate management** – Each template can have its own service type presets, default fields, and later its own reports/exports.
- **Clearer UX** – No switching tabs; one context per screen.
- **Extensibility** – Easy to add type-specific fields (e.g. battery % for E-bike/E-car, odometer for Bike/Car) or workflows per template.

**Tier access:**

| Tier                   | Core access | Extended / future |
|------------------------|------------|-------------------|
| **Premium**            | **Bike** and **Car** templates only – direct access to `/services/bike` and `/services/car`. | Per-template presets, job card, bulk add. |
| **Premium Plus**       | All of Premium + **E-bike** and **E-car** templates – direct access to all 4 routes. | Per-template history, reminders, line items. |
| **Premium Plus Plus**  | All of Premium Plus + **Reports, Export, Upcoming** (per template or combined). | Analytics, reminders, invoice, multi-workshop. |

**Out of scope:** Basic and Standard users – they do not get any Services template (already gated).

---

## 2. Data Model

### 2.1 Core (Phase 1 – all tiers)

| Field             | Type     | Required | Notes |
|-------------------|----------|----------|--------|
| `id`              | number   | auto     | Primary key |
| `company_id`      | number   | yes      | Multi-tenant |
| `vehicle_type`    | string   | yes      | `'bike' \| 'car' \| 'ebike' \| 'ecar'` |
| `service_date`    | string   | yes      | ISO date |
| `customer_name`   | string   | no       | Customer/owner name |
| `vehicle_number`  | string   | no       | Registration / identification |
| `service_type`    | string   | no       | Oil change, Tyre, Battery, General, Repair, etc. |
| `amount`          | number   | yes      | Total service charge |
| `description`     | string   | no       | Notes |
| `next_service_date` | string | no       | For reminders (Premium Plus Plus) |
| `created_at`      | string   | auto     | ISO timestamp |
| `updated_at`      | string   | auto     | ISO timestamp |
| `created_by`      | number   | no       | User id |

### 2.2 Optional / future fields (extend model when building those features)

| Field               | Type     | Tier suggestion | Purpose |
|---------------------|----------|-------------------|---------|
| `customer_id`       | number   | Premium+          | Link to existing Customer (sales/customers) |
| `payment_method`    | string   | Premium+          | cash \| upi \| card \| other |
| `payment_status`    | string   | Premium+          | pending \| paid \| partial |
| `status`            | string   | Premium Plus+     | draft \| in_progress \| completed \| cancelled |
| `job_card_number`   | string   | Premium+          | Unique job/reference number for print |
| `odometer_reading`  | number   | Premium Plus+     | Km reading (car/bike) |
| `battery_health_pct` | number  | Premium Plus+     | E-bike/E-car battery % (optional) |
| `labour_amount`     | number   | Premium Plus+     | Labour vs parts breakdown |
| `parts_amount`      | number   | Premium Plus+     | Parts cost |
| `tax_amount`        | number   | Premium Plus Plus  | GST/tax on service |
| `discount_amount`   | number   | Premium Plus+     | Discount given |
| `reminder_sent_at`  | string   | Premium Plus Plus  | Last reminder sent (ISO) |
| `workshop_id`       | number   | Premium Plus Plus  | Multi-location / workshop |
| `assigned_to`       | number   | Premium Plus Plus  | Technician / staff user id |
| `attachments`       | array    | Premium Plus+     | File URLs or base64 (receipts, photos) |
| `service_items`     | array    | Premium Plus+     | Line items: description, amount, type (labour/part) |

- **Storage:** IndexedDB store `SERVICES` (single store, one record type with `vehicle_type`) + optional Supabase for sync.
- **Plan gating:** Same store; each **template** (Bike, Car, E-bike, E-car) is a separate route and UI; APIs filter by `vehicle_type`. Tier controls which templates the user can see (Premium = Bike + Car only; Premium Plus+ = all 4).

### 2.3 Per-template (per–vehicle-type) management

Because we have **4 templates** instead of one generic service screen, we can manage many things **separately** per vehicle type:

| What can be separate per template | Description |
|-----------------------------------|-------------|
| **Route & entry** | Each template has its own URL and dashboard card (e.g. “Bike Services”, “Car Services”). |
| **List & filters** | Each page shows only that vehicle type; filters and columns can differ later (e.g. odometer for Bike/Car, battery % for E-bike/E-car). |
| **Service type presets** | Different dropdown options per template (e.g. Bike: Oil change, Chain, Tyre; Car: Oil change, AC, Brake; E-bike/E-car: Battery check, Motor service). |
| **Form fields** | Optional type-specific fields (e.g. `odometer_reading` for Bike/Car; `battery_health_pct` for E-bike/E-car) shown only on that template. |
| **Reports & export** | Later: report/export per template (e.g. “Bike report”, “Car report”) or combined. |
| **Settings / defaults** | Later: default labour rate, default service types, or job card layout per vehicle type. |

Data stays in one table with `vehicle_type`; the 4 templates are 4 “views” (4 routes/pages) that filter and configure UI per type.

---

## 3. Feature Split by Tier (4 templates, 3-part plan)

### Part 1 – Premium (Bike + Car templates)

**Goal:** Two separate templates – **Bike** and **Car** – with direct access. No E-bike or E-car.

| #  | Item              | Description |
|----|-------------------|-------------|
| 1.1| Plan feature      | Use `services_bike_car_ebike` (min tier premium). Premium sees only Bike and Car templates. |
| 1.2| Data layer        | `ServiceRecord` type, `STORES.SERVICES`, IndexedDB + indexes (`company_id`, `vehicle_type`, `service_date`). |
| 1.3| Service API       | `serviceRecordService`: getAll(companyId?, vehicleType?), getById, create, update, delete. Each template calls with its `vehicle_type` (bike or car). |
| 1.4| **Bike template** | Route `/services/bike`. Dedicated list (bike only), add/edit form (vehicle_type fixed to bike), delete. Bike-specific service type presets if desired. |
| 1.5| **Car template**  | Route `/services/car`. Dedicated list (car only), add/edit form (vehicle_type fixed to car), delete. Car-specific service type presets if desired. |
| 1.6| List & form       | Each template: list columns (date, customer, vehicle number, service type, amount, actions); search/filter by date, customer, amount. Form: service date, customer name, vehicle number, service type dropdown (per-template presets), amount, description. No vehicle type selector (fixed by route). |
| 1.7| Permissions       | Existing `services:*`; routes gated by `services_bike_car_ebike`. |
| 1.8| Dashboard         | **Two cards** (or one “Services” section with two cards): “Bike Services” → `/services/bike`, “Car Services” → `/services/car`. Premium users see only these two. |

**Deliverable:** Premium users get direct access to Bike and Car templates and full CRUD for each, managed separately.

---

### Part 2 – Premium Plus (E-bike + E-car templates)

**Goal:** Add two more templates – **E-bike** and **E-car** – with direct access. User now has 4 separate templates.

| #  | Item               | Description |
|----|--------------------|-------------|
| 2.1| Plan / tier        | When tier is `premium_plus` or `premium_plus_plus`, show all 4 templates (Bike, Car, E-bike, E-car). Premium continues to see only Bike and Car. |
| 2.2| **E-bike template** | Route `/services/ebike`. Dedicated list (ebike only), add/edit form (vehicle_type fixed to ebike). E-bike-specific service type presets (e.g. Battery check, Motor, Brake). Optional: battery_health_pct field. |
| 2.3| **E-car template** | Route `/services/ecar`. Dedicated list (ecar only), add/edit form (vehicle_type fixed to ecar). E-car-specific presets. Optional: battery_health_pct, odometer. |
| 2.4| Dashboard          | **Two more cards** for Premium Plus (and above): “E-bike Services” → `/services/ebike`, “E-car Services” → `/services/ecar`. So total 4 cards in Services section when user has Premium Plus or higher. |
| 2.5| List & form        | Same pattern as Bike/Car; each template is independent. No vehicle type selector; route defines type. |
| 2.6| Cloud sync         | If Supabase used, sync all four vehicle types (same store, filter by vehicle_type). |

**Deliverable:** Premium Plus (and above) get direct access to all 4 templates and can manage Bike, Car, E-bike, and E-car separately.

---

### Part 3 – Premium Plus Plus

**Goal:** **Reports**, **Export**, **Upcoming services** (can be per-template or combined).

| #  | Item                | Description |
|----|---------------------|-------------|
| 3.1| Plan feature        | `services_reports_export_upcoming` (min tier `premium_plus_plus`). |
| 3.2| Services report      | Summary by vehicle type (Bike / Car / E-bike / E-car), by period, date range; total amount, count. Can be one combined report or separate report per template. |
| 3.3| Export               | Excel/PDF for service records (date range, optional filter by one or more templates). Per-template export (e.g. “Export Bike services”) fits the 4-template model. |
| 3.4| Upcoming services    | List where `next_service_date` within 7/30 days; vehicle, customer, due date. Can be combined or per-template (e.g. “Upcoming Bike services”). |
| 3.5| Dashboard widget     | Optional “Upcoming services” card (count or next 3), optionally filterable by template. |

**Deliverable:** Premium Plus Plus gets Reports, Export, and Upcoming (and optional widget), with the option to manage each template’s data separately in reports/exports.

---

## 4. All Possible Future Features (roadmap)

Below is a **full list of possible future features**, grouped by category. Each has a **suggested tier** (P = Premium, P+ = Premium Plus, P++ = Premium Plus Plus). Order within a tier can be decided later.

### 4.1 Core CRUD & list (Premium / Premium Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Link to existing customer | P | Select customer from Customers list; auto-fill name/phone. |
| Service type presets | P | Configurable list (Oil change, Tyre, Battery, General, Repair, etc.) per company. |
| **Per-template service type presets** | P | **Separate preset list per template** (Bike, Car, E-bike, E-car) so each vehicle type has its own dropdown options (e.g. Bike: Chain, Tyre; Car: AC, Brake; E-bike/E-car: Battery check, Motor). |
| Job card number | P | Auto or manual job/reference number; show in list and form. |
| Print job card | P | Print/PDF single service as job card (customer, vehicle, services, amount). |
| Bulk add services | P | Add multiple services in one screen (e.g. same date, different vehicles). |
| Payment method | P | cash / upi / card / other on service record. |
| Payment status | P | pending / paid / partial; filter list by status. |
| Search by vehicle number | P | Quick search and filter by vehicle number. |
| Service status | P+ | draft / in_progress / completed / cancelled; filter by status. |
| Odometer reading | P+ | Optional km reading (bike/car). |
| Battery health % | P+ | Optional for e-bike/e-car. |
| Labour vs parts split | P+ | labour_amount, parts_amount; optional breakdown. |
| Discount | P+ | discount_amount; show in list and report. |
| Attachments | P+ | Upload receipt/photo per service (store URL or base64). |
| Line items (service items) | P+ | Multiple rows per job: description, amount, type (labour/part). |
| Recurring schedule | P+ | e.g. “every 3 months”; suggest next_service_date. |
| Service templates/packages | P+ | Predefined package (e.g. “Full service – Bike”) with default items/amount. |

### 4.2 Reports & analytics (Premium Plus Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Report: by vehicle type | P++ | Total revenue and count per vehicle type (already in Part 3). |
| Report: by period | P++ | Day/week/month summary (already in Part 3). |
| Report: by service type | P++ | Revenue and count per service type. |
| Report: by customer | P++ | Top customers by service spend; list services per customer. |
| Comparative report | P++ | This month vs last month; YoY comparison. |
| Revenue trend chart | P++ | Chart (daily/weekly/monthly) for service revenue. |
| Export to Excel/PDF | P++ | Already in Part 3; extend with more columns/filters. |
| Export for CA / accounting | P++ | Summary export suitable for accountant. |
| Dashboard widget: service revenue | P++ | Today’s / this week’s / this month’s service revenue on Dashboard. |
| Low revenue alert | P++ | Notify if service revenue below threshold in a period. |

### 4.3 Reminders & notifications (Premium Plus / Premium Plus Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Upcoming services list | P++ | Already in Part 3 (next 7/30 days). |
| Dashboard “Upcoming” widget | P++ | Already optional in Part 3. |
| In-app reminder list | P++ | Dedicated page: services due in next N days. |
| Email reminder | P++ | Send email to customer (or shop) X days before next_service_date. |
| SMS reminder | P++ | Send SMS before next service (requires SMS gateway). |
| WhatsApp reminder | P++ | Send WhatsApp message (requires API). |
| Push notification (PWA) | P++ | “3 services due this week” to logged-in user. |
| Reminder settings | P++ | Configure days before (e.g. 7, 3, 1); enable/disable email/SMS. |
| Recurring reminder | P+ | Auto-set next_service_date from template (e.g. +3 months). |

### 4.4 Customer & vehicle (Premium Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Customer link | P | Already in “future” – link service to Customer. |
| Vehicle history | P+ | Per vehicle number: list all past services (same or linked customer). |
| Customer service history | P+ | Per customer: all services across vehicles. |
| Vehicle/customer quick add | P+ | Add new customer or vehicle from service form without leaving page. |
| Preferred service types per vehicle | P+ | Optional; suggest service type from history. |

### 4.5 Invoicing & tax (Premium Plus Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Generate invoice from service | P++ | Create a formal invoice (PDF) for the service job. |
| GST/tax on service | P++ | tax_amount; optional GST %; show in invoice and reports. |
| HSN/SAC code | P++ | Service accounting code for GST. |
| Invoice number series | P++ | Separate series for service invoices. |
| Payment receipt | P++ | Print receipt when payment marked paid. |

### 4.6 Multi-location & assignment (Premium Plus Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Workshops / branches | P++ | workshop_id; filter and report by workshop. |
| Technician assignment | P++ | assigned_to (user id); list “My jobs” for that user. |
| Assign from service form | P++ | Dropdown to assign to technician. |
| Report by technician | P++ | Revenue or count per technician. |
| Report by workshop | P++ | Revenue or count per workshop. |

### 4.7 Inventory & parts (Premium Plus Plus – advanced)

| Feature | Tier | Description |
|---------|------|-------------|
| Parts used in service | P++ | Link to product/parts; quantity used; deduct from stock. |
| Service + stock deduction | P++ | On “completed”, deduct parts from inventory. |
| Parts catalog for services | P++ | List of parts that can be attached to service types. |
| Low stock alert for parts | P++ | When part used in services is below min stock. |

### 4.8 UX & productivity (all tiers)

| Feature | Tier | Description |
|---------|------|-------------|
| Keyboard shortcuts | P | Quick add, search, next tab. |
| Last used filters | P | Remember date range, vehicle type, customer. |
| Sort list by date/amount/customer | P | Column sort. |
| Pagination or infinite scroll | P | For large lists. |
| Duplicate service | P+ | “Copy” last service for same vehicle (change date). |
| Quick edit amount/date in list | P+ | Inline edit without opening form. |
| Barcode scan vehicle number | P+ | If barcode on vehicle/plate. |
| Dark mode | P | Follow app theme. |
| Mobile-optimised form | P | Touch-friendly; large buttons. |

### 4.9 Integrations & advanced (future / Premium Plus Plus)

| Feature | Tier | Description |
|---------|------|-------------|
| Calendar integration | P++ | Show upcoming services in calendar view or export to Google Calendar. |
| Sync to accounting software | P++ | Export format for Tally/QuickBooks etc. |
| API for third-party | P++ | REST API to create/read services (for POS or other apps). |
| Customer app / portal | P++ | Customer logs in to see service history and book next service. |
| Automated exports | P++ | Scheduled export (e.g. daily service summary to email). |
| Backup/restore services | P++ | Include services in app backup/restore. |
| Audit log for services | P++ | Who created/updated/deleted which service. |
| Multi-currency | P++ | If app supports it; service amount in selected currency. |

---

## 5. Plan feature summary (implementation)

| Feature key | Min tier | Purpose |
|-------------|----------|---------|
| `services_bike_car_ebike` | premium | Unlock Services; Premium = Bike + Car only. |
| (Optional) `services_ebike_ecar` | premium_plus | Unlock E-bike & E-car; or use tier check in UI. |
| `services_reports_export_upcoming` | premium_plus_plus | Reports, Export, Upcoming services. |

**Suggested:**  
- One feature for access: `services_bike_car_ebike` = premium. Premium sees **2 templates** (Bike, Car) only; Premium Plus and above see **all 4 templates** (Bike, Car, E-bike, E-car).  
- One feature for advanced: `services_reports_export_upcoming` = premium_plus_plus.

**Future plan features (when you build them):**  
- e.g. `services_invoice_tax` (P++), `services_reminders` (P++), `services_multi_workshop` (P++), `services_parts_inventory` (P++).

---

## 6. Implementation order

**Phase 1 – Part 1 (Premium)**  
- Types, DB store, serviceRecordService.  
- **Bike template:** route `/services/bike`, list + add/edit form (vehicle_type = bike), delete.  
- **Car template:** route `/services/car`, list + add/edit form (vehicle_type = car), delete.  
- Dashboard: 2 cards (“Bike Services”, “Car Services”). Premium sees only these two.  

**Phase 2 – Part 2 (Premium Plus)**  
- **E-bike template:** route `/services/ebike`, list + form (vehicle_type = ebike).  
- **E-car template:** route `/services/ecar`, list + form (vehicle_type = ecar).  
- Dashboard: add 2 more cards (“E-bike Services”, “E-car Services”) for Premium Plus and above.  
- Cloud sync if applicable.  

**Phase 3 – Part 3 (Premium Plus Plus)**  
- Plan feature for reports/export/upcoming.  
- Services report (by vehicle type / per template), Export (per template or combined), Upcoming list, optional dashboard widget.  

**Phase 4+ (future)**  
- Per-template presets, job card, payment status; then reminders, reports expansion, invoice/tax, etc. (from §4).

---

## 7. Files to add/modify (high level)

| Phase | Add | Modify |
|-------|-----|--------|
| 1 | `src/types/serviceRecord.ts`, `src/services/serviceRecordService.ts`, `src/pages/ServiceForm.tsx` (accepts `vehicleType` param), `src/pages/ServicesList.tsx` (accepts `vehicleType`), SERVICES store | `src/database/db.ts`, `src/App.tsx` (routes: `/services/bike`, `/services/car`), Dashboard (2 cards: Bike, Car) |
| 2 | – | `src/App.tsx` (routes: `/services/ebike`, `/services/ecar`), Dashboard (add 2 cards: E-bike, E-car); optional cloud service |
| 3 | `src/pages/ServicesReports.tsx` (or section), export helper, Upcoming section | `src/utils/planFeatures.ts`, `src/App.tsx` (reports route if needed), Dashboard (optional widget) |
| 4+ | Per feature (e.g. per-template presets, reminder service, invoice component) | planFeatures, ServiceForm (per-template fields), new routes |

**Note:** One shared `ServiceForm` and one shared `ServicesList` (or `ServiceListByType`) that receive `vehicleType` (bike | car | ebike | ecar) from the route is enough; no need for 4 separate page components unless you want fully custom UI per template later.

---

## 8. Review checklist

- [ ] **4 templates:** Bike, Car, E-bike, E-car each have direct access (own route and dashboard card).  
- [ ] Premium: **2 templates** (Bike, Car) only; full CRUD for each.  
- [ ] Premium Plus: **4 templates** (Bike, Car, E-bike, E-car); full CRUD; manage each separately.  
- [ ] Premium Plus Plus: above + Reports, Export, Upcoming (and optional widget); per-template or combined.  
- [ ] Data model (core + optional fields) agreed; per-template presets/fields possible.  
- [ ] Plan feature keys and tiers agreed.  
- [ ] Cloud sync (Supabase) in or out of scope.  
- [ ] Future features list (§4) reviewed; priorities and tier placement confirmed.

Once you confirm this plan (and any changes to tiers or priorities), development can proceed in three parts: Premium (2 templates) → Premium Plus (4 templates) → Premium Plus Plus (reports/export/upcoming), with future items taken from §4 as needed.
