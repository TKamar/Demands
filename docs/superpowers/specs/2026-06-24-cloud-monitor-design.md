# Cloud Monitor Integration — Design Spec

**Date:** 2026-06-24  
**Branch:** feature/cloud-monitor-integration

## Context
The Demands monorepo has no visibility into operational cloud infrastructure status.
CloudDashboard.jsx contains 72 hardcoded service-status entries (4 sites, 9 clusters, 8 services).
This spec covers converting it to a live, DB-backed panel integrated into the workspace.

## Decisions
- Tab: upper TopNavTab, label "זמינות משאבים", visible to ALL roles
- Theme: re-themed to Tailwind v4 tokens (drop custom dark CSS)
- Schema: new CloudResourceStatus model, FK-linked to Base/Network/Cluster
- Edit UX: inline chip popover, ADMIN/MODERATOR only
- Architecture: Approach A — single CloudMonitorPanel.tsx

## Schema
CloudResourceStatus: id, baseName→Base, networkName→Network, clusterName→Cluster,
service, status (green|yellow|red), reason, tag (OK|CAPACITY|CLIENT_PROCESS|MAINTENANCE),
updatedAt, updatedBy. Unique: [baseName, networkName, clusterName, service].

## API
- GET  /api/cloud-monitor        — authenticate + requireAuth — returns nested tree
- PUT  /api/cloud-monitor/:id    — authenticate + requireModerator — updates status/reason/tag

## Frontend
TopNavTabId union gains 'cloudMonitor'. getAvailableTabs returns it for all roles.
CloudMonitorPanel fetches /api/cloud-monitor, renders CustomerView (heatmap) or OpsTree (tree).
ADMIN/MODERATOR see "עריכת נתונים" toggle. Clicking a chip in edit mode opens inline EditPopover.
