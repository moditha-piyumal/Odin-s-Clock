# 🕰️ Odin’s Clock – Project Description

## Overview
**Odin’s Clock** is a lightweight, always-on desktop utility built with **Electron**.  
It functions as a personal time-awareness and reminder system designed to reduce cognitive load and prevent missed daily actions.

The application is intentionally:
- local-only
- minimal
- reliable
- resource-efficient

This is **personal infrastructure**, not a public SaaS product.

---

## Philosophy
Odin, in Norse mythology, sacrificed comfort in pursuit of knowledge.  
This project follows the same philosophy: building a quiet but powerful system that supports discipline, learning, and long-term execution without distraction or overengineering.

---

## Core Design Principles
- Extremely low RAM and CPU usage
- Polling-based time logic (minute-level precision)
- No seconds anywhere in the UI
- Local-only storage (no cloud, no accounts)
- UI-first architecture with expandable sections
- Reliability over feature richness

---

## Technology Stack
- **Electron** (desktop application)
- **Vanilla JavaScript** for time and logic
- **JSON** for local persistence
- Storage location: Electron `app.getPath("userData")`
- Prebuilt **glassmorphism UI**

---

## Window Behavior
- Small dock-style window anchored to the edge of the screen
- Always displays current time in **24-hour HH:MM format**
- Expands on hover to reveal full UI
- Collapses automatically when not hovered
- No seconds displayed anywhere

---

## Feature Implementation Order (STRICT)
1. Clock  
2. Scheduled Tasks  
3. Intermittent Fasting Timer  
4. Pomodoro Timer  

This order must not be changed.

---

## Feature Details

### 1️⃣ Clock (Foundation)
- Reflects system time
- Updates once per minute (polling-based)
- Acts as the single time source for all other features

---

### 2️⃣ Scheduled Tasks
- Supports **one-time tasks** (date + time)
- Supports **daily recurring tasks** (time only)
- Local desktop notifications at scheduled times
- Daily tasks reset automatically each day
- Completed tasks are visually greyed out
- All data stored locally in JSON

---

### 3️⃣ Intermittent Fasting Timer
- User sets a minimum gap between meals (e.g. 3 hours)
- “I just ate” button starts a countdown
- Countdown displayed in minutes only
- Button disabled until countdown reaches zero
- No seconds, no overprecision

---

### 4️⃣ Pomodoro Timer
- Configurable work duration
- Configurable rest duration
- Configurable number of cycles
- Alerts at transitions between work and rest
- Classic Pomodoro workflow

---

## Architecture Overview
- Single polling loop running once per minute
- Central time engine
- Feature modules subscribe to time updates
- No independent timers running in parallel
- Clear separation between UI and logic

---

## Storage
- JSON files stored in Electron AppData (`userData`)
- No external databases
- No third-party services
- App is packaged-ready from the beginning

---

## Explicit Non-Goals (V1)
The following are **intentionally excluded**:
- Cloud sync
- User accounts
- Analytics
- History tracking
- Snooze logic
- Themes or customization systems
- Integration with War Room or other apps

---

## Development Workflow
- UI skeleton implemented first (empty sections allowed)
- Features added strictly in defined order
- Changes committed and pushed to GitHub
- Codex works via branches / pull requests
- All Codex changes tested locally before merge

---

## Purpose
Odin’s Clock exists to:
- reduce cognitive overhead
- protect daily discipline
- prevent missed actions
- support learning and long-term execution

It is designed to be trusted enough to run **all day, every day**, quietly in the background.
