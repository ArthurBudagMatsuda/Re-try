// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {integer,real,sqliteTable,text,uniqueIndex,index} from 'drizzle-orm/sqlite-core';
export const attempts=sqliteTable('attempts',{
 id:integer('id').primaryKey(),attemptNumber:integer('attempt_number').notNull().unique(),tokenAddress:text('token_address').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull(),endedAt:integer('ended_at'),failureReason:text('failure_reason'),peakMarketCap:real('peak_market_cap').notNull(),peakHolders:integer('peak_holders').notNull(),volume:real('volume').notNull(),
});
export const rounds=sqliteTable('voting_rounds',{
 id:text('id').primaryKey(),attemptId:integer('attempt_id').notNull().references(()=>attempts.id),roundNumber:integer('round_number').notNull(),startedAt:integer('started_at').notNull(),endsAt:integer('ends_at').notNull(),retryVotes:integer('retry_votes').notNull().default(0),keepVotes:integer('keep_votes').notNull().default(0),status:text('status').notNull(),
},t=>[uniqueIndex('round_attempt_number').on(t.attemptId,t.roundNumber)]);
export const votes=sqliteTable('votes',{
 id:text('id').primaryKey(),votingRoundId:text('voting_round_id').notNull().references(()=>rounds.id),walletAddress:text('wallet_address').notNull(),choice:text('choice').notNull(),createdAt:integer('created_at').notNull(),
},t=>[uniqueIndex('one_wallet_one_round').on(t.votingRoundId,t.walletAddress)]);
export const sessions=sqliteTable('sessions',{
 id:text('id').primaryKey(),walletAddress:text('wallet_address'),challenge:text('challenge').notNull(),createdAt:integer('created_at').notNull(),lastActionAt:integer('last_action_at').notNull().default(0),lastSimulationAt:integer('last_simulation_at').notNull().default(0),
});
export const limits=sqliteTable('rate_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('limit_expiry').on(t.expiresAt)]);
