# RE:TRY

A sequence of token attempts with manual administration and a digital Cemetery. Every attempt has an immutable mint address. The project remains RE:TRY throughout the sequence.

## Product
- `/`: current attempt, simulated token statistics, activity indicator and up to three previous attempts.
- `/cemetery`: responsive digital gravestones, a live total of dead attempts and complete final snapshots in a detail dialog. Results load in batches so every archived attempt is reachable.
- Owner-only controls mark the current attempt DEAD and register the next attempt manually. A closed attempt leaves the current panel immediately. No replacement is registered until the administrator explicitly acts.
- Valid mint metadata links to Solscan. Simulated mint metadata clearly disables that link.

## Architecture
`lib/retry/attempts.ts` owns TokenManager, persisted attempt state, final snapshots, `markAttemptAsDead(attemptId, reason)` and `createNextAttempt(metadata)`.
`lib/retry/adapter.ts` contains the read-only BlockchainAdapter interface and MockSolanaAdapter. The adapter does not issue tokens. A future creation service must be a separately authorized integration; registration currently saves metadata only.
`lib/retry/config.ts` centralizes mock monitoring and chart configuration. Activity is illustrative data and has no administrative side effects.
`db/schema.ts` declares only Attempt data. Existing mints and historical timestamps are retained during upgrades. Applied schema history is immutable; subsequent migrations remove obsolete tables and add final-statistic fields. The historic `ended_at` and `volume` SQL columns map to diedAt and totalVolume in the schema to preserve existing records.

## Administration
The backend verifies the platform-provided authenticated user identity and email against the server-side RETRY_ADMIN_EMAIL environment value. Configure that value with Sites runtime settings. It is never exposed in the browser. Unauthorized or missing identities are rejected, even if callers bypass the UI. Mutations require a matching Origin, bounded payloads and validated metadata. Final closure is conditional on ACTIVE status, so concurrent closure calls cannot rewrite an archived snapshot. Metadata registration enforces mint uniqueness and refuses to register while an active attempt exists. The UI requires a reason and explicit confirmation before closure.

The site keeps its existing owner-private audience. If the audience is widened later, administrative writes still require the configured owner identity. Authentication comes from the platform; wallet administration may be added in a future integration.

## Development
Use Node 22.13+ with the existing npm lockfile. Run npm ci and npm run dev. Generate SQL using npm run db:generate when schema changes, inspect it, and apply only pending migrations locally via Wrangler with dist/server/wrangler.json and .wrangler/state. Local `.dev.vars` configures the test administrator and is ignored. Production secrets belong in Sites settings.

No real tokens, blockchain transactions, private keys, token issuance or automatic attempt replacement are implemented. Monitoring runs while the page is open; closing an attempt is always a manual administrator action.

Browser WebMCP tools expose read-only current-state and cemetery operations when supported. Runtime WebMCP validation requires a supporting browser.
