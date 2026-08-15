# Contributing to FitWise

How the two of us work on this together without stepping on each other. Keep it lightweight — we're two friends, not a corporation. But a little structure now saves headaches later.

---

## 🌱 Branching

- `main` (or `master`) is always the working version. Don't commit broken code straight to it.
- Make a branch for each feature or fix:
  - `feat/workout-logging`
  - `fix/streak-off-by-one`
  - `docs/update-roadmap`
- Open a Pull Request to merge into `main`. Even a quick glance from the other person catches a lot.

## ✍️ Commits

Keep messages short and clear about *what changed*. A light convention helps:

- `feat: add streak counter`
- `fix: correct PR detection for reps`
- `docs: add data model sketch`
- `chore: update dependencies`

## 🔀 Pull Requests

- Say what the PR does and why in a sentence or two.
- Ideally the other person gives it a quick 👍 before merging.
- Small PRs > giant ones. Easier to review, easier to revert.

## 🗂️ Tracking work

- Big picture → [ROADMAP.md](ROADMAP.md)
- Actual to-dos & bugs → **GitHub Issues** (use the templates in `.github/ISSUE_TEMPLATE/`)
- Decisions & why → [ARCHITECTURE.md](ARCHITECTURE.md)

## 🧑‍🤝‍🧑 Splitting the work

A rough way to divide so we're not both editing the same file:
- Split by **pillar** (one takes Workouts, the other Nutrition), or
- Split by **layer** (one on Firebase/data, one on UI).

Talk it through per phase. The [ROADMAP.md](ROADMAP.md) phases are a natural unit to divide.

## 🔐 Secrets — important

**Never commit secrets or API keys** (Firebase config with private keys, service-account files, `.env` files). The [.gitignore](../.gitignore) already excludes common ones. If something sensitive gets committed by accident, tell the other person — we may need to rotate the key.

## 📄 License

We haven't picked a license yet. Options:
- **MIT** — simple, permissive, fine if we don't mind others reusing it.
- **No license (private)** — keep it just ours for now.

Decide before making the repo public. Until then, treat it as private between us.

---

Questions or a big decision to make? Add it to the "Open questions" in [FEATURES.md](FEATURES.md) or the decision log in [ARCHITECTURE.md](ARCHITECTURE.md), and talk it out.
