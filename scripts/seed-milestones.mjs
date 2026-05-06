import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'dev.db'));
const now = new Date().toISOString();

// Convert "Mon-YY" to an ISO date string (1st of that month)
const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
function parseDate(str) {
  const [mon, yr] = str.split('-');
  return new Date(2000 + Number(yr), MONTHS[mon], 1).toISOString();
}

// Deliverable events sourced from: RxEVO Modernization Milestones(RxEVO Modernization) (2).csv
// Only rows with a completion date are included (others represent forecasted/future work)
const events = [
  { name: 'Cloud Infra v1',                             date: 'Dec-21', workType: 'Platform',          description: 'Nonprod & prod clusters, CI/CD, databases' },
  { name: 'Notifications',                              date: 'Feb-22', workType: 'Replacement',        description: 'Production deployment — Terraform prod provisioning, GCR image promotion, load testing, prod deployment, SMS/Email/DB alerting, Datadog dashboards, and initial bug fixes. Completed on-prem to cloud notification delivery pipeline.' },
  { name: 'Dev Experience & Templates',                 date: 'Mar-22', workType: 'Platform',          description: 'Cookie Cutter service template updated for new baseline (PubSub, Storage), Datadog enrichments (request filtering, log sinks), HWE engineer role refinement, logging pipeline finalized.' },
  { name: 'Cloud Infra v2',                             date: 'Apr-22', workType: 'Platform',          description: 'Security Hardening, Networking & Feature Toggles' },
  { name: 'Web Scaffolding & Infra',                    date: 'Apr-22', workType: 'Platform',          description: 'Base Node.js Docker image, Angular app containerized for GKE, K8s namespace/service account/Vault provisioned, CI/CD pipeline in GitLab, multi-environment configs, ESLint, Mortar design system integration.' },
  { name: 'Jx Browser',                                 date: 'Jul-22', workType: 'Platform',          description: 'JxBrowser 7 prototype validated for embedding Angular in Swing client, CORS enabled, Nginx configured, prod configs deployed, firewall rules opened between RxEVO Client and GCP, store-level validation.' },
  { name: 'Store Service',                              date: 'Sep-22', workType: 'Replacement',        description: 'Cloud Pharmacy Store Service — project scaffolding, database, tables (pharmacy, store_hours, holidays, printers), PubSub, CRUD APIs, prod pipeline, data load from Oracle to PostgreSQL. First cloud "reference data" service.' },
  { name: 'Rx Ad Board & Manager',                      date: 'Oct-22', workType: 'Replacement/New',   description: 'Replace legacy RxEVO patient screens in stores with configurable ads' },
  { name: 'Compliance & Security Observability',        date: 'Nov-22', workType: 'Platform',          description: 'Sysdig' },
  { name: 'Login Screen',                               date: 'Dec-22', workType: 'Replacement',        description: 'First functional pharmacy panels: login screen with User Service integration' },
  { name: 'Foundational Domain Services',               date: 'Dec-22', workType: 'Replacement',        description: 'User service, Patient service, Audit service' },
  { name: 'RxEVO Lite Platform',                        date: 'Dec-22', workType: 'BusinessContinuity', description: 'Nonprod & prod infrastructure' },
  { name: 'Notification Log',                           date: 'Dec-22', workType: 'Replacement',        description: null },
  { name: 'Product & Prescriber Services',              date: 'Jan-23', workType: 'Replacement',        description: null },
  { name: 'Pre-Pay v1',                                 date: 'Mar-23', workType: 'New',               description: 'Credit cards' },
  { name: 'Will Call Panel',                            date: 'Mar-23', workType: 'Replacement',        description: 'Modernize the Will Call Panel where filled prescriptions are organized and held for customer pickup. Includes bin management and receipt scanning. Depends on Print/Zebra.' },
  { name: 'Pre-Pay Panel',                              date: 'May-23', workType: 'New',               description: null },
  { name: 'Return to Stock',                            date: 'Aug-23', workType: 'Replacement',        description: null },
  { name: 'Prescription Service',                       date: 'Sep-23', workType: 'Replacement',        description: null },
  { name: 'GSDD VM Standup & Elsevier Integration',     date: 'Oct-23', workType: 'Replacement',        description: 'Hosted VM for drug information, and an integration into the API from Elsevier for med guides and drug information' },
  { name: 'Oracle Proxy',                               date: 'Oct-23', workType: 'New',               description: 'Proxy between on-prem and cloud services to help with data aggregation.' },
  { name: 'Product Search',                             date: 'Oct-23', workType: 'Replacement',        description: null },
  { name: 'Paperless',                                  date: 'Oct-23', workType: 'New',               description: null },
  { name: 'Notification Log v2',                        date: 'Oct-23', workType: 'Replacement',        description: null },
  { name: 'Counsel Dialog',                             date: 'Nov-23', workType: 'Replacement',        description: 'Monograph display, compliance history, vial label, sig/directions, DUR modal, task timer, Hardcopy display, printing, rotation' },
  { name: 'Rx Alerts',                                  date: 'Nov-23', workType: 'Replacement',        description: null },
  { name: 'Refill Reminders',                           date: 'Dec-23', workType: 'New',               description: null },
  { name: 'Prescription Dispensing Workflows',          date: 'Jan-24', workType: 'Replacement',        description: null },
  { name: 'Third Party Billing',                        date: 'Jan-24', workType: 'Replacement',        description: null },
  { name: 'Adult to Adult Relationship Mgmt',           date: 'Apr-24', workType: 'New',               description: null },
  { name: 'Product Inventory & Price Dialogs',          date: 'May-24', workType: 'Replacement',        description: null },
  { name: 'Drug Education',                             date: 'May-24', workType: 'New',               description: null },
  { name: 'Rx Delivery v1',                             date: 'May-24', workType: 'New',               description: null },
  { name: 'Pre-Pay HSA/FSA',                            date: 'Jun-24', workType: 'New',               description: null },
  { name: 'Prescription Delay',                         date: 'Jun-24', workType: 'New',               description: null },
  { name: 'API Gateway & New Auth Pattern',             date: 'Jul-24', workType: 'Platform',          description: null },
  { name: 'Batch Counsel',                              date: 'Jul-24', workType: 'New',               description: null },
  { name: 'Specialty Rx Panel',                         date: 'Jul-24', workType: 'Replacement',        description: null },
  { name: 'Rx Delivery v2',                             date: 'Aug-24', workType: 'New',               description: null },
  { name: 'RxEVO Lite v1',                              date: 'Sep-24', workType: 'BusinessContinuity', description: 'Maintain and enhance RxEVO Lite — the business continuity pharmacy system used when RxEVO is unavailable. Requires ETL for prescription history, Third Party Service testing, and DUR history.' },
  { name: 'Cancel Order',                               date: 'Oct-24', workType: 'New',               description: null },
  { name: 'Product Tab',                                date: 'Nov-24', workType: 'Replacement',        description: null },
  { name: 'Curbside Rx Arrivals',                       date: 'Dec-24', workType: 'New',               description: null },
  { name: 'Product Images Migration',                   date: 'Feb-25', workType: 'Replacement',        description: null },
  { name: 'Reverify Account',                           date: 'Mar-25', workType: 'New',               description: null },
  { name: 'GraphQL',                                    date: 'Apr-25', workType: 'Platform',          description: null },
  { name: 'Patient Search',                             date: 'May-25', workType: 'Replacement',        description: null },
  { name: 'Product Compound Workflow',                  date: 'Jun-25', workType: 'Replacement',        description: null },
  { name: 'Pharmacy App Push Notifications',            date: 'Jun-25', workType: 'New',               description: null },
  { name: 'Compound Rx Refillable in App',              date: 'Jul-25', workType: 'New',               description: null },
  { name: 'Pharmacy Settings in App',                   date: 'Aug-25', workType: 'New',               description: null },
  { name: 'Product Panel',                              date: 'Sep-25', workType: 'Replacement',        description: 'Rewrite the Product Panel used for drug product search, pricing, inventory levels, and NDC management. Includes DSCSA/track-and-trace barcode expiration scanning.' },
  { name: 'TP Plan & Cardholder Search',                date: 'Oct-25', workType: 'New',               description: null },
  { name: 'Express Check-In',                           date: 'Oct-25', workType: 'New',               description: null },
  { name: 'Workers Comp Dialogs',                       date: 'Jan-26', workType: 'Replacement',        description: null },
  { name: 'Patient Allergy',                            date: 'Jan-26', workType: 'Replacement',        description: null },
  { name: 'Patient Insurance Info & Eligibility Checks', date: 'Mar-26', workType: 'Replacement',      description: null },
];

const stmt = db.prepare(`
  INSERT INTO Event (name, date, description, type, impactSentiment, workType, resourceCount, resourcesReturned, timelineId, createdAt, updatedAt)
  VALUES (?, ?, ?, 'DELIVERABLE', 'POSITIVE', ?, NULL, 0, 1, ?, ?)
  ON CONFLICT DO NOTHING
`);

// Also update workType on any already-existing rows (idempotent re-run)
const updateStmt = db.prepare(`
  UPDATE Event SET workType = ? WHERE name = ? AND timelineId = 1 AND type = 'DELIVERABLE'
`);

const insertAll = db.transaction((rows) => {
  for (const r of rows) {
    stmt.run(r.name, parseDate(r.date), r.description ?? null, r.workType ?? null, now, now);
    updateStmt.run(r.workType ?? null, r.name);
  }
});

insertAll(events);
console.log(`Seeded/updated ${events.length} DELIVERABLE events for timeline 1 (RxEVO Modernization).`);
db.close();
