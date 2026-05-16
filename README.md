# 🏅 Playoff Game

A full-stack NBA & NHL playoff draft game with friends, built with Next.js and Supabase.

## Features

- **Snake Draft** — 8 players, 4 rounds (2 NBA + 2 NHL teams each)
- **Tier-Based Scoring** — Seeds 1-4 are Tier 1 (safer), Seeds 5-8/Wildcards are Tier 2 (multipliers)
- **Series Tracking** — Track playoff series round-by-round with game-by-game results
- **Live Leaderboard** — Real-time standings with detailed score breakdowns
- **Tiebreaker** — Predict the combined score of the final NBA + NHL games
- **Make a Bet!** — No-login side-bet market where bettors pick a pool player winner

## Scoring System

| Round | Tier 1 (Seeds 1-4) | Tier 2 (Seeds 5-8 / Wildcard) |
|-------|-------------------|-------------------------------|
| Round 1 Series Win | +2 pts | +5 pts |
| Round 2 Series Win | +4 pts | +8 pts |
| Conference Finals Win | +8 pts | +15 pts |
| Finals Win | +15 pts | +25 pts |

### Bonuses
- 🎯 **Every game win:** +1 pt
- 🏆 **Championship bonus:** +10 pts (winning Finals/Stanley Cup)
- ⚡ **Efficiency (win in ≤6 games):** +2 pts
- 🧹 **Sweep (4-0):** +3 pts *(stacks with efficiency = +5 total)*

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run migration files in order:
	- `supabase/migrations/001_initial_schema.sql`
	- `supabase/migrations/002_daily_picks_game.sql`
	- `supabase/migrations/003_side_bet_markets.sql`

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SIDE_BET_ADMIN_KEY=choose-a-secret-admin-key
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by the server-side API routes for inserts, updates, and deletes when Row Level Security is enabled.

`SIDE_BET_ADMIN_KEY` protects side-bet admin actions (create market and settle market) via the `x-admin-key` header.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Players** — Add up to 8 players
2. **Teams** — Load default 2026 NBA/NHL playoff teams (or add manually)
3. **Make a Bet!** — Submit one side-bet entry per name for the active market
4. **Series & Games** — Create series matchups and enter game winners
5. **Leaderboard** — View live standings with full score breakdowns
6. **Tiebreaker** — Players submit predictions for the final game combined score

## Side-Bet Admin API

Create a market:

```bash
curl -X POST http://localhost:3000/api/side-bets \
	-H "Content-Type: application/json" \
	-H "x-admin-key: $SIDE_BET_ADMIN_KEY" \
	-d '{
		"title": "Conference Finals Winner Bet",
		"description": "Pick the pool winner after conference finals.",
		"lock_at": "2026-05-20T23:00:00Z",
		"option_player_ids": ["player-uuid-1", "player-uuid-2", "player-uuid-3", "player-uuid-4"]
	}'
```

Settle a market:

```bash
curl -X PUT http://localhost:3000/api/side-bets/settle \
	-H "Content-Type: application/json" \
	-H "x-admin-key: $SIDE_BET_ADMIN_KEY" \
	-d '{
		"market_id": "market-uuid",
		"winning_option_id": "option-uuid"
	}'
```
