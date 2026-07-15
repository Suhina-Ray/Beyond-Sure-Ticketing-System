CREATE DATABASE IF NOT EXISTS ticket_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE ticket_db;

--  TABLE 1: employees
CREATE TABLE IF NOT EXISTS employees (
    employee_id     INT             AUTO_INCREMENT  PRIMARY KEY,
    employee_code   VARCHAR(20)     NOT NULL,
    employee_name   VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    NOT NULL,
    mobile          VARCHAR(20)     NOT NULL,
    password        VARCHAR(255)    NOT NULL,
    designation     VARCHAR(100)    NULL,
    department      VARCHAR(100)    NULL,
    status          ENUM('Active', 'Inactive')
                                    NOT NULL DEFAULT 'Active',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_employee_email  UNIQUE (email),
    CONSTRAINT uq_employee_code   UNIQUE (employee_code)
) ENGINE = InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_emp_email  ON employees (email);
CREATE INDEX idx_emp_status ON employees (status);

--  TABLE 2: tickets

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id       INT             AUTO_INCREMENT  PRIMARY KEY,
    subject         VARCHAR(255)    NOT NULL,
    description     TEXT            NOT NULL,
    partner_name           VARCHAR(150)    NULL,
    request_mobile_number  VARCHAR(20)     NULL,
    page_name              VARCHAR(150)    NULL,
    category                VARCHAR(100)    NULL,
    remarks         TEXT            NULL,
    assign_to       INT             NULL,
    status          ENUM(
                        'Open',
                        'In Progress',
                        'Resolved',
                        'Closed'
                    )               NOT NULL DEFAULT 'Open',
    assigned_at     TIMESTAMP       NULL,
    closed_at       TIMESTAMP       NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_assign_to
        FOREIGN KEY (assign_to)
        REFERENCES employees (employee_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE = InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_ticket_status    ON tickets (status);
CREATE INDEX idx_ticket_assign_to ON tickets (assign_to);
CREATE INDEX idx_ticket_created   ON tickets (created_at);

--  TABLE 3: ticket_attachments

CREATE TABLE IF NOT EXISTS ticket_attachments (
    attachment_id   INT             AUTO_INCREMENT  PRIMARY KEY,
    ticket_id       INT             NOT NULL,
    file_name       VARCHAR(255)    NOT NULL,
    org_file_name   VARCHAR(255)    NOT NULL,
    uploaded_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attach_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets (ticket_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE = InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_attach_ticket ON ticket_attachments (ticket_id);

--  TABLE 4: ticket_activity

CREATE TABLE IF NOT EXISTS ticket_activity (
    activity_id     INT             AUTO_INCREMENT  PRIMARY KEY,
    ticket_id       INT             NOT NULL,
    assign_to       INT             NULL,
    remarks         TEXT            NOT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets (ticket_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_activity_employee
        FOREIGN KEY (assign_to)
        REFERENCES employees (employee_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE = InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_activity_ticket ON ticket_activity (ticket_id);


-- ============================================================
--  Verify
-- ============================================================
DESCRIBE employees;
DESCRIBE tickets;
DESCRIBE ticket_attachments;
DESCRIBE ticket_activity;
