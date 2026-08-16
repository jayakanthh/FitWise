# Mock data seed (dev only)

Populates Firestore with 5 mock users and a ready-made crew **"Iron Squad"** (invite code **`IRON01`**) so the friend-group leaderboards look alive while testing.

## Run it

1. **Get a service-account key** (one time):
   Firebase console → ⚙️ **Project settings** → **Service accounts** → **Generate new private key**. Save the downloaded file here as:
   ```
   backend/seed/serviceAccount.json
   ```
   (gitignored — it's a secret, never commit it)

2. **Install + run:**
   ```bash
   cd backend/seed
   npm install
   npm run seed
   ```

3. **See it in the app:** open IronSync → **Group** tab → **Join with a code** → enter `IRON01`. You'll drop into Iron Squad with a full streak leaderboard.

## What it creates
- 5 users (Arjun, Rohan, Kabir, Vikram, Sana) with stats + streaks
- Crew "Iron Squad" (invite code `IRON01`) with all 5 as members
- A streak leaderboard and a bench-press PR leaderboard

**Mock logins** (if you want to sign in *as* one of them): `<name>@ironsync.dev` / `ironsync123`
(e.g. `arjun@ironsync.dev`).

## Re-running
Safe to run again — it upserts (reuses existing users by email, overwrites their data).
