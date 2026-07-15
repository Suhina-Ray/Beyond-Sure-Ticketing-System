-- Adds partner_name, request_mobile_number, page_name, category to the
-- existing tickets table. Safe to run on your live ticket_db.

USE ticket_db;

ALTER TABLE tickets
    ADD COLUMN partner_name           VARCHAR(150) NULL AFTER description,
    ADD COLUMN request_mobile_number  VARCHAR(20)  NULL AFTER partner_name,
    ADD COLUMN page_name              VARCHAR(150) NULL AFTER request_mobile_number,
    ADD COLUMN category               VARCHAR(100) NULL AFTER page_name;
