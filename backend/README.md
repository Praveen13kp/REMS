# Backend — Real Estate Lead Management

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Apply migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start dev server
npm run dev
```

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed demo data (safe to re-run) |
| `npm run db:reset` | Drop tables, re-migrate, re-seed |

## Demo Users (after seeding)

Users are created in the database. To set passwords, sign up via the app UI using the same email:

| Email | Role |
|-------|------|
| owner@acme.com | OWNER |
| manager@acme.com | MANAGER |
| agent1@acme.com | AGENT |
| agent2@acme.com | AGENT |
