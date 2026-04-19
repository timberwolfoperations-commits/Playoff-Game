# 🏅 Playoff Game

A full-stack NBA & NHL playoff draft game with friends, built with Next.js and Supabase.

## Features

- **Snake Draft** — 8 players, 4 rounds (2 NBA + 2 NHL teams each)
- **Tier-Based Scoring** — Seeds 1-4 are Tier 1 (safer), Seeds 5-8/Wildcards are Tier 2 (multipliers)
- **Series Tracking** — Track playoff series round-by-round with game-by-game results
- **Live Leaderboard** — Real-time standings with detailed score breakdowns
- **Tiebreaker** — Predict the combined score of the final NBA + NHL games

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
2. In the SQL Editor, run the migration file: `supabase/migrations/001_initial_schema.sql`

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by the server-side API routes for inserts, updates, and deletes when Row Level Security is enabled.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Players** — Add up to 8 players
2. **Teams** — Load default 2025 NBA/NHL playoff teams (or add manually)
3. **Draft** — Run the snake draft (picks are auto-generated in 1→N, N→1 order)
4. **Series & Games** — Create series matchups and enter game winners
5. **Leaderboard** — View live standings with full score breakdowns
6. **Tiebreaker** — Players submit predictions for the final game combined score
