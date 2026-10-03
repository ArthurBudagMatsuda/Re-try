# RE:TRY

Full-stack mock MVP with a dark terminal interface, persisted attempts, 30-minute voting rounds, signed Solana wallet identities, server-issued demo identities, and an automatic retry lifecycle. No token creation, transaction signing, private keys, trading or Pump.fun integration occurs.

## Layers
- app/retry-dashboard.tsx: UI, timer display, voting and history. Reads the JSON API every five seconds; remaining time is anchored to server time.
- app/api: state, session, vote and explicit simulation endpoints.
- lib/retry/service.ts: TokenManager coordinates persistent attempts, round closure and new attempts.
- lib/retry/adapter.ts: BlockchainAdapter contract and MockSolanaAdapter. Mock fixtures are seeded only for the mock adapter.
- lib/retry/decision.ts: shouldCreateNextAttempt accepts token activity, community vote, voting round, system conditions and extensible indicators.
- lib/retry/config.ts: ATTEMPT_CONFIG centralizes timing, performance criteria and rate limits. The thresholds are illustrative mock settings, not calibrated trading criteria.
- db/schema.ts and drizzle/: D1 schema and migration for attempts, rounds, votes, sessions and rate limits.

## Voting and security
The server selects the current attempt and voting round. Clients submit only a choice. A unique database index prevents multiple votes by the same verified wallet per round, including across separate sessions. Wallet ownership is verified using an Ed25519 signature of a nonce-bound, origin-specific message; no transaction is requested. Session cookies are HTTP-only, SameSite Strict and Secure on HTTPS. Mutation routes check Origin, apply request limits and per-session cooldowns, and verify round expiry in the insertion query.

Demo identities are explicitly for testing, and do not establish wallet ownership or provide Sybil resistance. On hosted signed-in requests the demo identity uses the platform user ID; on localhost it uses a server-generated session ID. Never treat demo voting as production governance.

Round closure and condition evaluation are lazy, driven by state polling. Expired rounds are reconciled when monitoring resumes. A failed attempt stays visible for six seconds before the next attempt begins. When no visitor is polling, no background worker is claimed to be running. Before unattended live operation, add a scheduler or durable coordinator using the same service.

## Integration boundary
Implement BlockchainAdapter with a trusted Solana data provider. For real token creation, replace the mock createToken implementation only after adding authorization, an idempotent creation operation and transaction coordination; D1 uniqueness currently coordinates the mock insertion, not external blockchain side effects. Initialize the first live attempt separately. Calibrate ATTEMPT_CONFIG from actual market observations. Store any future secrets in server-side environment bindings.

## Development
Use Node 22.13+ and npm. Run npm ci, npm run db:generate after schema changes, and npm run build. Apply the migration to the local DB using Wrangler with dist/server/wrangler.json and .wrangler/state, then run npm run dev. See scripts/verify-retry.mjs for the functional verification; it uses only localhost and resets the local simulation database before testing. It verifies origin checks, server validation, duplicate votes, real message signatures, round rollover, preserved results, and automatic retry. Do not run it against production.

WebMCP tools feature-detect browser support and expose get_retry_state and cast_retry_vote using the same visible UI actions. A browser with WebMCP support is required for runtime validation.
