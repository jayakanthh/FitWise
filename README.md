# 💪 FitWise

> A gym & fitness companion app that helps you and your friends train smarter, eat better, and stay motivated together.

FitWise started as a simple idea between two friends who lift together: an app to track our workouts, follow a plan, keep our nutrition in check, and — most importantly — keep each other accountable and hyped. Streaks, shared PRs, supplement notes... the stuff that actually keeps a gym crew going.

This repo is where we plan, design, and build it.

---

## ✨ What FitWise does (the vision)

FitWise is built around five pillars:

### 🏋️ Workouts
- Log daily workouts
- Follow structured training plans
- Track personal records (PRs)

### 🥗 Nutrition
- Build a diet plan
- Count calories & macros
- Log what you eat

### 👤 Profile & Health
- Personal profile
- Body measurements over time
- Health issues / notes so plans train you safely

### 👥 Friend Group
- A private crew of friends
- Share supplement results
- PR leaderboard across the crew
- Streak leaderboard — see who's got the longest run going 🔥
- Get pinged when someone beats your PR

### 🔥 Motivation
- Daily streak counter
- Nudges to keep the habit alive

> 💡 **Adding an idea?** Just drop a bullet under the right pillar above — no table formatting to fight with. For the detailed breakdown with build phases, see **[docs/FEATURES.md](docs/FEATURES.md)**.

---

## 🗺️ Where we're headed

We're building in phases so we always have something working. Short version:

1. **MVP** — profile + log a workout + streak counter (the core daily loop)
2. **PRs & Friend Group** — personal records, the crew, PR leaderboard & "someone beat your PR" alerts
3. **Nutrition** — diet plans, calorie & macro tracking, food log
4. **Supplements & polish** — supplement result sharing, notifications, refinement

Full plan with milestones: **[docs/ROADMAP.md](docs/ROADMAP.md)**.

---

## 🧱 Tech stack

We're **still deciding the frontend** (mobile vs web) — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the trade-offs we're weighing.

What we've decided so far:

- **Backend / data:** [Firebase](https://firebase.google.com/) — authentication, database, and push notifications, so two people can ship without running our own servers.
- **Frontend:** _TBD_ (React Native, Flutter, or web — decision pending)
- **Language:** _TBD_ (follows the frontend choice)

> ℹ️ Nothing is locked in beyond the backend. If you're reading this later and we picked a stack, this section will say so.

---

## 📁 Repo structure

```
FitWise/
├── README.md              ← you are here
├── docs/                  ← all planning & design docs
│   ├── FEATURES.md        ← every feature, broken down
│   ├── ROADMAP.md         ← phased build plan & milestones
│   ├── DATA_MODEL.md      ← how data is organized (Firebase sketch)
│   ├── ARCHITECTURE.md    ← tech decisions & trade-offs
│   └── CONTRIBUTING.md    ← how we work together on this
├── .github/               ← issue templates for tracking ideas & bugs
└── .gitignore
```

Once we pick a stack, app code lands in folders like `app/` or `src/` (and maybe `functions/` for Firebase Cloud Functions).

---

## 🚀 Getting started

Right now this is a **planning repo** — no app code yet. To get involved:

1. Read **[docs/FEATURES.md](docs/FEATURES.md)** to see what we're building.
2. Read **[docs/ROADMAP.md](docs/ROADMAP.md)** to see what's next.
3. Check **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** for how we branch, commit, and divide work.

When we start coding, setup instructions go here.

---

## 👥 The team

Two friends who lift and wanted an app that actually fit how they train. 🤝

---

## 📄 License

Not chosen yet — see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md#license) for the decision we need to make.
