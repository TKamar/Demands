# Cloud Monitor Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a Cloud/Ops Resource Monitor Dashboard into the Demands monorepo as a live, DB-backed "זמינות משאבים" tab with Prisma persistence and RBAC mutation controls.

**Architecture:** A new `CloudMonitorPanel.tsx` (Approach A — thin panel wrapper) is mounted as an upper `TopNavTab` visible to all roles. Static dashboard data is replaced by a `CloudResourceStatus` Prisma model (FK-linked to existing `Base`/`Network`/`Cluster`). A `GET /api/cloud-monitor` endpoint serves the nested data tree; a role-guarded `PUT /api/cloud-monitor/:id` endpoint handles admin/moderator mutations. An inline chip popover provides the edit UX.

**Tech Stack:** React 19 + TypeScript + Tailwind v4, Express + Prisma 5 + PostgreSQL, react-oidc-context, i18next.

## Global Constraints

- Sole author identity: `tkamar` — no AI references in commits, comments, or docs
- All work on branch `feature/cloud-monitor-integration`, merged only to `dev`
- WORK_LOG.md must be updated after every task
- Target codebase root: `C:\Projects\Demands\Demands\`
- Frontend root: `client/src/` — Backend root: `server/src/`
- No test infrastructure exists in this project — verification steps use curl and Prisma Studio
- Existing `Base`/`Network`/`Cluster` seed has English names; the cloud monitor seed must upsert the Hebrew reference records before creating `CloudResourceStatus` rows

[Full plan content would continue with all 8 tasks as specified in the input...]
