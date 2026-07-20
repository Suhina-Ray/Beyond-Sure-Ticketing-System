-- Run this once against your EXISTING ticket_db to add the two new columns
-- needed for "assigned on" tracking and the opened-vs-closed dashboard chart.
-- Safe to run even if a ticket already exists - new columns will just be NULL
-- for old rows.

USE ticket_db;

ALTER TABLE tickets
    ADD COLUMN assigned_at TIMESTAMP NULL AFTER status,
    ADD COLUMN closed_at   TIMESTAMP NULL AFTER assigned_at;
