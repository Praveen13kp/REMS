# S5-BE-A-05 — Broker role + BrokerCompany + scoped endpoints

**Owner:** BE dev
**Branch:** `be/broker/S5-BE-A-05-role-and-endpoints`
**Estimated:** 2 days
**Blocks:** S5-FE-A-02
**Blocked by:** S5-BE-A-01 (multi-tenant email — broker may use same email at multiple companies)

## Goal

A broker is a person who works leads on behalf of multiple brokerages. They get their own dashboard, but the leads they see come from many companies.

## Steps

1. **Schema**:
   - `Role` enum → add `BROKER`
   - New model `BrokerCompany { brokerUserId, companyId, status (INVITED|ACTIVE|REVOKED), invitedAt, acceptedAt, @@unique([brokerUserId, companyId]) }`
   - A broker `User` row has `companyId = null` (similar to SUPER_ADMIN) — their "home" is the BrokerCompany rows
2. **Invite flow**:
   - `POST /api/users/invite-broker { email, name }` (OWNER/MANAGER) — creates the User if new, creates `BrokerCompany` with status `INVITED`, sends email
   - Broker accepts via existing invite token → status `ACTIVE`
3. **Broker endpoints** (`/api/broker/*`, auth: role BROKER):
   - `GET /companies` — list active linked companies
   - `GET /dashboard?companyId=...` — KPIs scoped to one company OR all
   - `GET /leads?companyId=...&scope=assigned|own` — leads assigned to this broker by that company OR leads the broker created
4. **Lead visibility middleware** — when role=BROKER, the tenant scope is the union of their active BrokerCompany rows; can be filtered by `?companyId=`.
5. Activity + notifications work the same for brokers.

## Acceptance criteria

- [ ] OWNER can invite a broker by email; broker accepts; appears in the company's team list with role BROKER
- [ ] Broker can be invited by a second company with the same email; sees both in `/broker/companies`
- [ ] `GET /broker/leads` returns only leads assigned to the broker in the requested company
- [ ] Cross-tenant probe: broker tries to fetch a lead ID from a company they're NOT linked to → 404
- [ ] Schema migration is reversible
