# Productivity Calculation Logic

This document explains how the team productivity scores are calculated in the Daylog platform.

## Overview
The productivity report combines data from two sources:
1.  **Redmine**: Official project tracking (Issues, Bugs, Features).
2.  **Daylog**: Daily activity logs (typically for WFH or supplementary tasks).

The system offers three different perspectives (Options) to evaluate performance.

## Option 1: Combined Completion Rate (Redmine Focus)
**Best for:** Teams prioritizing official Redmine tracking.

*   **Logic**:
    *   **If Member has NO Daylog tasks**: Score is **100%** based on Redmine Completion Rate.
    *   **If Member HAS Daylog tasks**: Score is weighted **75% Redmine** + **25% Daylog**.
*   **Formula**:
    `Score = (Redmine Rate * 0.75) + (Daylog Rate * 0.25)`

## Option 2: Weighted Performance (Balanced)
**Best for:** Teams where WFH/Daylog output is considered equal to Office/Redmine output.

*   **Logic**:
    *   **If Member has NO Daylog tasks**: Score is **100%** based on Redmine Completion Rate.
    *   **If Member HAS Daylog tasks**: Score is weighted **50% Redmine** + **50% Daylog**.
*   **Formula**:
    `Score = (Redmine Rate * 0.50) + (Daylog Rate * 0.50)`

## Option 3: Time-based Efficiency
**Best for:** Measuring velocity and speed of execution.

*   **Logic**: Measures how many tasks are completed per working day.
*   **Formula**: `(Total Tasks Completed / Total Working Days Spent) * 25`
*   **Baseline**: Assumes completing 4 tasks per full working day (8 hours) receives 100 points.

## Key Definitions
*   **Redmine Rate**: `(Closed Issues / Total Assigned Issues) * 100` [Filtered by period]
*   **Daylog Rate**: `(Completed Activities / Total Activities) * 100` [Filtered by period]
*   **Period**: All calculations are strictly bounded by the selected Start Date and End Date.
