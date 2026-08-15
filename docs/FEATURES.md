# IronSync — Features

This is the full breakdown of what IronSync should do, grouped into the five pillars. Each feature notes roughly which phase it belongs to (see [ROADMAP.md](ROADMAP.md)). Nothing here is final — it's our shared source of truth for scope. Edit freely.

Legend: 🟢 MVP · 🔵 Phase 2 · 🟡 Phase 3 · ⚪ Phase 4 / later

---

## 🏋️ 1. Workouts

The core of the app — logging what you actually did in the gym.

- 🟢 **Log a workout** — record exercises, sets, reps, and weight for a given day.
- 🟢 **Exercise library** — a list of common exercises to pick from (bench, squat, deadlift, etc.) so logging is fast.
- 🟢 **Workout history** — browse past workouts by date.
- 🔵 **Personal records (PRs)** — automatically detect and store your best lift for each exercise (heaviest weight, best reps).
- 🔵 **Follow a plan** — pick or create a structured training plan (e.g. Push/Pull/Legs, 5x5) and have the app tell you what to do today.
- 🟡 **Progress charts** — see weight/volume trends per exercise over time.
- ⚪ **Rest timer** — timer between sets.
- ⚪ **Custom exercises** — add your own exercises not in the library.

## 🥗 2. Nutrition

Helping you eat for your goals.

- 🟡 **Diet plan** — set a daily calorie & macro target based on your goal (cut / maintain / bulk).
- 🟡 **Calorie counting** — log food and track calories against your target.
- 🟡 **Macro tracking** — track protein / carbs / fats, not just calories.
- 🟡 **Food log / history** — see what you ate by day.
- ⚪ **Food database** — search foods with known nutrition info (may use a third-party API).
- ⚪ **Barcode scan** — scan packaged food to log it quickly.
- ⚪ **Water tracking** — daily water intake.

## 👤 3. Profile & Health

Knowing the person so the app can train them safely and personally.

- 🟢 **User profile** — name, age, gender, height, weight, training goal.
- 🟢 **Body measurements** — track weight and body measurements (arms, chest, waist, etc.) over time.
- 🟢 **Health notes** — record any health issues, injuries, or limitations (e.g. bad knee, asthma) so plans account for them.
- 🟡 **Measurement charts** — visualize measurement changes over time.
- ⚪ **Progress photos** — optional private photos to track visual progress.

> ⚠️ **Health-data note:** health issues and body data are sensitive personal information. We should treat this carefully — keep it private to the user by default and be mindful of data-privacy rules. See [ARCHITECTURE.md](ARCHITECTURE.md#privacy--sensitive-data). IronSync is a fitness tracker, **not** medical advice.

## 👥 4. Friend Group (Social)

The thing that makes IronSync *ours* — a private crew that keeps each other going.

- 🔵 **Friend group / crew** — create or join a small private group of friends.
- 🔵 **PR leaderboard** — see the crew's PRs per exercise; who's lifting what.
- 🔵 **Streak leaderboard** — the whole crew's current streaks ranked, so you can see who's on the longest run. Losing your #1 spot should sting just enough to get you to the gym. 🔥
- 🔵 **"Someone beat your PR" alert** — when a friend beats a PR you held, you get notified (friendly competition 🔥).
- ⚪ **Supplement results sharing** — post whether a supplement is working for you (e.g. "creatine — week 4, strength up"), so the crew can see what's actually giving results.
- ⚪ **Activity feed** — see friends' recent workouts / streaks.
- ⚪ **Reactions / cheers** — react to a friend's workout or PR.

> 💊 **Supplement note:** this is friends sharing personal experience, **not** medical or nutritional advice. Worth a small disclaimer in the app.

## 🔥 5. Motivation

Keeping the habit alive.

- 🟢 **Streak counter** — count consecutive days (or scheduled gym days) you've trained. Breaking a streak hurts — that's the point.
- 🔵 **Group streak leaderboard** — your streak isn't just personal; the crew can see everyone's ranked. (Also listed under Friend Group — it's the social side of the streak.)
- 🔵 **Streak reminders** — a nudge/notification when your streak is about to break.
- ⚪ **Milestones / badges** — celebrate 7-day, 30-day, 100-day streaks and PR milestones.
- ⚪ **Weekly recap** — a summary of your week (workouts done, PRs hit, streak status).

---

## ❓ Open questions to decide together

- Does a "streak" mean every calendar day, or only your planned training days (so rest days don't break it)?
- Is the friend group capped in size (just us + a few) or open?
- For nutrition, do we build our own food database or plug into a third-party nutrition API?
- Do we need accounts/login from day one, or start local and add auth later? (Firebase makes auth easy, so probably day one.)
- What's the one feature that, if it works, makes *us* actually use the app daily? (That's the real MVP.)
