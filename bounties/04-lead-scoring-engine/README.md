# Bounty #4: Lead Scoring Engine ($250)

Configurable ML-Weighted Lead Scoring Engine with Rule Weights, MQL/SQL Thresholds, and Real-Time Score Breakdown.

## Features
- **Configurable Scoring Rules & Feature Weights**: Adjust weights for demographic, firmographic, and behavioral signals (e.g., Pricing Page Visits, Enterprise Domain, Demo Requested, Email Engagement, Negative Decay).
- **Dynamic MQL / SQL Threshold Classification**: Automatically classifies leads into `SQL (Hot)`, `MQL (Warm)`, or `Nurture (Cold)` with logistic probability estimation.
- **Persistent Lead & Rule Management**: Add leads, toggle signal attributes, adjust rule weights, and persist via `localStorage` and async `onChange` with rollback on failure.
