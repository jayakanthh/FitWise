# FitWise — Roadmap

We build in phases so there's always something working we can actually use. Each phase should be usable on its own before we move to the next. Ship small, use it ourselves, then expand.

The golden rule: **the fastest way to kill this project is to try to build everything at once.** Get the daily loop working first.

---

## 🎯 Phase 0 — Foundations (setup)

Before any feature code.

- [ ] Decide the frontend stack (see [ARCHITECTURE.md](ARCHITECTURE.md)) — mobile vs web.
- [ ] Create the Firebase project and add both of us as members.
- [ ] Get a "hello world" build running on both our machines.
- [ ] Agree on how we split work & branch (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## 🟢 Phase 1 — MVP: the daily loop

**Goal:** open the app, log today's workout, see your streak go up. If this feels good to use, we're onto something.

- [ ] User profile (name, age, height, weight, goal)
- [ ] Body measurements + health notes
- [ ] Exercise library (a starter set of common lifts)
- [ ] Log a workout (exercises, sets, reps, weight)
- [ ] Workout history by date
- [ ] Streak counter

**Definition of done:** both of us can log our real workouts for a week and watch our streaks.

## 🔵 Phase 2 — PRs & the crew

**Goal:** the social hook — friendly competition.

- [ ] Auto-detect and store PRs per exercise
- [ ] Create/join a friend group
- [ ] PR leaderboard across the crew
- [ ] "Someone beat your PR" notification
- [ ] Follow a training plan (structured routine tells you today's workout)
- [ ] Streak reminders

**Definition of done:** beating a friend's PR sends them a notification, and we can both see the leaderboard.

## 🟡 Phase 3 — Nutrition

**Goal:** track eating alongside training.

- [ ] Set calorie & macro targets from a goal (cut/maintain/bulk)
- [ ] Log food & count calories against target
- [ ] Macro tracking (protein/carbs/fat)
- [ ] Food log history
- [ ] Progress & measurement charts

**Definition of done:** we can hit a daily calorie target and see the day's totals.

## ⚪ Phase 4 — Supplements & polish

**Goal:** the extras that make it feel complete.

- [ ] Supplement results sharing in the crew
- [ ] Activity feed & reactions
- [ ] Milestones / badges
- [ ] Weekly recap
- [ ] Food database / barcode scan
- [ ] Progress photos

---

## 📌 How we track work

Day-to-day tasks live in **GitHub Issues** (use the templates in `.github/ISSUE_TEMPLATE/`). This roadmap is the big picture; issues are the actual to-dos. Consider a GitHub Project board once we have more than a handful of open issues.
