# Contributing Guidelines & Collaboration Workflow

This document outlines the collaborative version control workflow, branching policy, pull request procedures, and code review criteria adopted for the **SnapLink** project under **SEC101: MCA Group Assignment**.

---

## 👥 Division of Responsibilities

Each student is responsible for an isolated set of functional features and documentation duties:

### Student 1 (Pulkit Bhagat - Repository Lead)
- **Branch**: `feature-member1`
- **Assigned Features**:
  1. Repository initialization, `.gitignore` baseline, and GitHub remote setup.
  2. Core Shortening Engine & 6-character random slug generator (`generate_code`).
  3. Custom alias validation with collision error handling (`create_short_url`).
  4. HTTP 302 Redirection endpoint and click tracking integration (`/{code}`).
  5. URL resolution endpoint (`/resolve/{code}`).
- **Reviewer Role**: Conduct code reviews and approve pull requests opened by Student 2.

### Student 2 (Ankit Bisht - Feature Developer)
- **Branch**: `feature-member2`
- **Assigned Features**:
  1. Link retrieval and case-insensitive search filter (`list_urls`).
  2. Link inspection and telemetry statistics (`get_stats`).
  3. Destination URL modification without altering short slug (`update_url`).
  4. Short link deletion with row-count verification (`delete_url`).
  5. Leaderboard aggregation query for top clicked links (`get_top_urls`).
- **Reviewer Role**: Conduct code reviews and approve pull requests opened by Student 1.

---

## 🌿 Branching Policy

1. **`main` Branch**:
   - The primary production-ready branch.
   - Direct commits to `main` are restricted during feature development.
   - Changes are merged into `main` exclusively through reviewed Pull Requests.

2. **Feature Branches**:
   - `feature-member1`: Dedicated branch for Student 1's features.
   - `feature-member2`: Dedicated branch for Student 2's features.

---

## 🔀 Pull Request & Code Review Workflow

### 1. Opening & Updating a Pull Request
1. Push your active feature branch (`feature-member1` for Student 1 or `feature-member2` for Student 2) to GitHub:
   ```bash
   git push -u origin feature-member1
   ```
2. Navigate to the **Pull requests** tab on GitHub and click **Compare & pull request** (or **New pull request**).
3. Set the **base** branch to `main` and the **compare** branch to your feature branch (`feature-member1` or `feature-member2`).
4. Provide a descriptive title (e.g., `feat: Add URL shortening and redirection engine` or `feat: Add dashboard UI, search, and analytics`).
5. Summarize the implemented features in the PR description and assign your partner under **Reviewers**.
6. Any subsequent commits pushed to the same branch (`git push`) are automatically appended to the existing open Pull Request.

### 2. Conducting a Code Review
1. Whenever additional commits are pushed after an initial review, click the circular **Re-request review** icon next to your partner's name in the **Reviewers** sidebar to trigger a fresh review notification.
2. The assigned reviewer inspects all modifications in the **Files changed** tab:
   - Verify that all FastAPI endpoints (`/shorten`, `/resolve/{code}`, `/{code}`, `/urls`, `/stats/{code}`, `/top`) and SQLite database queries conform to project specifications.
   - Leave constructive review comments on specific lines of code where appropriate.
   - Click **Review changes** → select **Approve** → click **Submit review**.

### 3. Merging into `main`
1. Once both Pull Requests are reviewed and approved, **Student 1** checks out `main`, merges `feature-member1`, and pushes the updated branch to `origin main`.
2. **Student 2** then pulls the latest `main` branch (`git pull origin main`), merges `feature-member2` into `main` locally to resolve merge conflicts in `database.py` and `main.py`, and pushes the resolved commit (`git push origin main`), which automatically marks both Pull Requests as merged on GitHub.

---

## 💥 Task 4: Merge Conflict Resolution Protocol

To demonstrate mastery of Git conflict handling in this project:

1. **Parallel Branching**: Both students checked out separate feature branches (`feature-member1` and `feature-member2`) from the common `main` base.
2. **Concurrent Modifications**: Both students created and modified overlapping core files (`database.py` and `main.py`) independently—specifically defining the `id` column schema differently in `database.py` and modifying the `FastAPI` initialization along with the `/` and `/shorten` endpoints in `main.py`.
3. **First Merge to `main`**: Student 1 pushed `feature-member1`, checked out `main`, merged `feature-member1` into `main`, and pushed the updated `main` branch to GitHub.
4. **Triggering the Conflict**: Student 2 switched to `main`, pulled the latest changes from `origin main` (incorporating Student 1's merged code), and executed `git merge feature-member2`.
5. **Conflict Detection**: Git halted the merge with `CONFLICT (add/add)` in both `database.py` and `main.py`, injecting conflict markers into `database.py`:
   ```python
   <<<<<<< HEAD
                   id INTEGER PRIMARY KEY,
   =======
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
   >>>>>>> feature-member2
   ```
   *(Here, `HEAD` represents the `main` branch with Student 1's changes, and `feature-member2` represents Student 2's incoming changes.)*
6. **Manual Resolution & Commit**: Student 2 opened `database.py` and `main.py`, reconciled both versions (retaining `id INTEGER PRIMARY KEY AUTOINCREMENT,` in `database.py` and the static frontend/dynamic URL handling in `main.py`), removed all Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), staged the resolved files (`git add database.py main.py`), committed the merge (`git commit -m "Resolved merge conflict in database.py and main.py"`), and pushed to `origin main`.
7. **Verification Artifacts**: Captured screenshots of:
   - The terminal output displaying `CONFLICT (add/add)` in `database.py` and `main.py`.
   - The editor showing the `<<<<<<< HEAD` and `>>>>>>> feature-member2` conflict markers and the cleaned-up resolution.
   - The terminal showing the staged files, resolution commit, and `git push origin main`.
