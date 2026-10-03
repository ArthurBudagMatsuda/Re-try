# RE:TRY

A sequence of token attempts with manual administration, a digital Cemetery and the RE:TRY manifesto. Every attempt has an immutable mint address. The project continues until we find the RUNNER.

## Run locally

Use Node.js 22.13+ and npm. On a new clone, copy `.env.example` to `.env`. A local `.env` has already been prepared in this workspace.

```sh
npm ci
npm run admin:setup
npm run db:migrate
npm run dev
```

The development server runs at http://localhost:5173. The local database is `retry.db`, outside Git. `admin:setup` asks for an email and a password without echoing the password; it writes a scrypt password hash and a random session secret into `.env`.

## Deploy to Vercel

See [VERCEL.md](./VERCEL.md) for the complete setup. The application uses standard Next.js commands and a libSQL database (local SQLite for development; a remote libSQL database for Vercel). Configure the five server variables from `.env.example`, migrate the destination database and import this GitHub repository using the Next.js preset.

## Product

- `/`: current attempt, simulated statistics, activity and previous attempts.
- `/#lore`: the English manifesto, RUNNER narrative and Cemetery link.
- `/cemetery`: digital gravestones and preserved final snapshots, with pagination.
- `/admin`: administrator login. Authorized controls on `/` close the active attempt or register the next one manually. Signing out clears the session cookie.
- The warning beside MINT ADDRESS opens on hover, focus or tap. Mint copying and Solscan links remain available for valid mint metadata.

## Architecture and administration

`lib/retry/attempts.ts` owns TokenManager, persisted attempt state and final snapshots. `lib/retry/db.ts` executes parameterized queries through `@libsql/client`. `db/schema.ts` and `drizzle/` retain the original SQLite schema history and add a shared login limit table.

Administrative requests require a signed, expiring HttpOnly cookie, a valid server configuration and a matching Origin. Passwords use salted scrypt hashes; sessions use HMAC signatures and expire after eight hours. Changing the password hash, administrator email or session secret invalidates existing sessions. Login attempts are limited in the database across server instances. Untrusted `oai-authenticated-user-*` headers do not grant access.

Closure captures the final statistics conditionally on ACTIVE status. Concurrent closures cannot overwrite an archived snapshot. Metadata registration enforces mint uniqueness and refuses to register while an attempt is active. The UI requires a reason and confirmation before closure. There is no automatic replacement, token issuance or blockchain transaction integration. Monitoring uses illustrative mock data.

## Database and verification

```sh
npm run db:generate   # after a schema change, inspect the resulting migration
npm run db:migrate   # apply pending migrations to the configured database
npm run build
npm run test:vercel
```

The Vercel verification script starts the production server with a disposable local database and temporary credentials. It checks migrations, authentication, origin validation, login limits, snapshots, concurrency and manual-only attempt lifecycle. Build the project before running it.

The original deployed Sites version and its D1 data remain separate. This GitHub source now targets Vercel; existing Cloudflare build scaffolding is retained as legacy code and is not used by `npm run build`. Data from the original Site is not copied into the new database automatically. Keep `.env`, database files and credentials outside Git.
