from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from functools import wraps
import mysql.connector
import jwt
import bcrypt
import datetime
import os
load_dotenv()
app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

@app.route("/")
def serve_index():
    """Serve the frontend's index.html at the site root."""
    return send_from_directory(app.static_folder, "index.html")

# ── MySQL Configuration ──────────────────────────────────────────────────────
TICKET_DB = {
    "host":     os.getenv("DB_HOST",        "localhost"),
    "user":     os.getenv("DB_USER",        "root"),
    "password": os.getenv("DB_PASSWORD",    ""),
    "database": os.getenv("TICKET_DB_NAME", "ticket_db"),
}
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Add it to your .env file before starting the server.")

def get_ticket_db():
    """Return a fresh connection to ticket_db (employees/tickets)."""
    return mysql.connector.connect(**TICKET_DB)


def token_required(f):
    """
    Decorator for protected routes.
    Checks Authorization: Bearer <token> header.
    Verifies the token is valid and employee is still Active.
    If admin marks employee Inactive, their next request will be rejected.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify(success=False, message="Token missing. Please log in."), 401

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify(success=False, message="Session expired. Please log in again."), 401
        except jwt.InvalidTokenError:
            return jsonify(success=False, message="Invalid token. Please log in."), 401

        # Check employee still exists and is Active in DB
        try:
            conn   = get_ticket_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT employee_id, employee_name, email, status, role FROM employees WHERE employee_id = %s",
                (payload["employee_id"],)
            )
            employee = cursor.fetchone()
        finally:
            try:
                cursor.close()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass

        if not employee:
            return jsonify(success=False, message="Employee account not found."), 401
        if employee["status"] != "Active":
            return jsonify(success=False, message="Your account has been deactivated. Please contact admin."), 403

        # Pass employee info into the route function
        return f(employee, *args, **kwargs)
    return decorated

# ═════════════════════════════════════════════════════════════════════════════
#  EMPLOYEES API  (ticket_db)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/employees", methods=["GET"])
def get_employees():
    """
    List all active employees.
    Used by the frontend to populate the assign-to dropdown.
    Query param: ?all=true  → include inactive employees too (admin use)
    """
    include_all = request.args.get("all", "false").lower() == "true"
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        if include_all:
            cursor.execute(
                """
                SELECT employee_id, employee_code, employee_name,
                       email, mobile, designation, department, role, status, created_at
                FROM employees
                ORDER BY employee_name ASC
                """
            )
        else:
            cursor.execute(
                """
                SELECT employee_id, employee_code, employee_name,
                       email, mobile, designation, department, role, status, created_at
                FROM employees
                WHERE status = 'Active'
                ORDER BY employee_name ASC
                """
            )
        rows = cursor.fetchall()
        for row in rows:
            row["created_at"] = str(row["created_at"])
        return jsonify(success=True, employees=rows, count=len(rows))
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e), employees=[]), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/employees/<int:emp_id>", methods=["GET"])
def get_employee(emp_id):
    """Get a single employee's details."""
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT employee_id, employee_code, employee_name,
                   email, mobile, designation, department, role, status, created_at
            FROM employees WHERE employee_id = %s
            """,
            (emp_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify(success=False, message="Employee not found."), 404
        row["created_at"] = str(row["created_at"])
        return jsonify(success=True, employee=row)
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/employees", methods=["POST"])
def create_employee():
    """
    Add a new employee (admin action).
    Body (JSON): employee_code, employee_name, email, mobile,
                 password, designation, department
    """
    data = request.get_json()
    required = ["employee_code", "employee_name", "email", "mobile", "password"]
    for field in required:
        if not data.get(field, "").strip():
            return jsonify(success=False, message=f"{field} is required."), 400

    try:
        conn   = get_ticket_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO employees
                (employee_code, employee_name, email, mobile, password, designation, department, role)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["employee_code"].strip(),
                data["employee_name"].strip(),
                data["email"].strip().lower(),
                data["mobile"].strip(),
                bcrypt.hashpw(data["password"].strip().encode(), bcrypt.gensalt()).decode(),
                data.get("designation", "").strip() or None,
                data.get("department",  "").strip() or None,
                data.get("role", "Employee") if data.get("role") in ("Admin", "Employee") else "Employee",
            )
        )
        conn.commit()
        return jsonify(success=True, message="Employee created.", employee_id=cursor.lastrowid), 201
    except mysql.connector.errors.IntegrityError as e:
        if "email"         in str(e): return jsonify(success=False, message="Email already exists."), 409
        if "employee_code" in str(e): return jsonify(success=False, message="Employee code already exists."), 409
        return jsonify(success=False, message="Duplicate entry."), 409
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/employees/<int:emp_id>", methods=["PUT"])
def update_employee(emp_id):
    """Update employee details."""
    data = request.get_json()
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE employees
               SET employee_name = %s,
                   email         = %s,
                   mobile        = %s,
                   designation   = %s,
                   department    = %s,
                   status        = %s
             WHERE employee_id = %s
            """,
            (
                data.get("employee_name", "").strip(),
                data.get("email",         "").strip().lower(),
                data.get("mobile",        "").strip(),
                data.get("designation",   "").strip() or None,
                data.get("department",    "").strip() or None,
                data.get("status",        "Active"),
                emp_id,
            )
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify(success=False, message="Employee not found."), 404
        return jsonify(success=True, message="Employee updated.")
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  AUTH API  - Login / Logout / Me
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/employees/login", methods=["POST"])
def employee_login():
    """
    Employee logs in with email + password.
    Returns a JWT token valid for 8 hours.
    Body (JSON): email, password
    """
    data = request.get_json()
    email    = data.get("email",    "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify(success=False, message="Email and password are required."), 400

    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT employee_id, employee_name, email, password, designation, department, role, status
            FROM employees WHERE email = %s
            """,
            (email,)
        )
        employee = cursor.fetchone()
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass

    # Email not found
    if not employee:
        return jsonify(success=False, message="Invalid email or password."), 401

    # Account is inactive
    if employee["status"] != "Active":
        return jsonify(success=False, message="Your account has been deactivated. Contact admin."), 403

    # Wrong password
    if not bcrypt.checkpw(password.encode(), employee["password"].encode()):
        return jsonify(success=False, message="Invalid email or password."), 401

    # All good - generate token
    payload = {
        "employee_id":   employee["employee_id"],
        "employee_name": employee["employee_name"],
        "email":         employee["email"],
        "role":          employee["role"],
        "exp":           datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return jsonify(
        success=True,
        message=f"Welcome, {employee['employee_name']}!",
        token=token,
        employee={
            "employee_id":  employee["employee_id"],
            "employee_name":employee["employee_name"],
            "email":        employee["email"],
            "designation":  employee["designation"],
            "department":   employee["department"],
            "role":         employee["role"],
        }
    )


@app.route("/api/employees/logout", methods=["POST"])
@token_required
def employee_logout(current_employee):
    """
    Logout - frontend should delete the token on their side.
    Since JWT is stateless, this just confirms the token was valid.
    """
    return jsonify(success=True, message=f"Goodbye, {current_employee['employee_name']}! Logged out successfully.")


@app.route("/api/employees/me", methods=["GET"])
@token_required
def get_my_profile(current_employee):
    """
    Employee views their own profile using their token.
    No need to pass employee_id in the URL - taken from the token.
    """
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT employee_id, employee_code, employee_name, email,
                   mobile, designation, department, role, status, created_at
            FROM employees WHERE employee_id = %s
            """,
            (current_employee["employee_id"],)
        )
        profile = cursor.fetchone()
        profile["created_at"] = str(profile["created_at"])
        return jsonify(success=True, employee=profile)
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  TICKETS API  (ticket_db)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/tickets", methods=["POST"])
def raise_ticket():
    """
    Customer raises a query (public endpoint - no login required).
    Body (JSON): subject, description, partner_name, request_mobile_number,
                 page_name, category   - the latter four are optional.
    Returns: ticket_id of the newly created ticket.
    """
    data = request.get_json()
    if not data.get("subject", "").strip():
        return jsonify(success=False, message="Subject is required."), 400
    if not data.get("description", "").strip():
        return jsonify(success=False, message="Description is required."), 400

    try:
        conn   = get_ticket_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tickets
                (subject, description, partner_name, request_mobile_number, page_name, category)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data["subject"].strip(),
                data["description"].strip(),
                data.get("partner_name",          "").strip() or None,
                data.get("request_mobile_number", "").strip() or None,
                data.get("page_name",             "").strip() or None,
                data.get("category",              "").strip() or None,
            )
        )
        conn.commit()
        ticket_id = cursor.lastrowid
        return jsonify(success=True, message="Ticket raised successfully.", ticket_id=ticket_id), 201
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/tickets/stats/daily", methods=["GET"])
def get_daily_ticket_stats():
    """
    Day-wise ticket counts for the last 7 days (today inclusive) - used by
    the dashboard's opened-vs-closed chart.
    Returns: [{date, opened, closed}, ...] oldest -> newest.
    """
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT DATE(created_at) AS day, COUNT(*) AS opened
            FROM tickets
            WHERE created_at >= (CURDATE() - INTERVAL 6 DAY)
            GROUP BY DATE(created_at)
            """
        )
        opened_rows = {str(r["day"]): r["opened"] for r in cursor.fetchall()}

        cursor.execute(
            """
            SELECT DATE(closed_at) AS day, COUNT(*) AS closed
            FROM tickets
            WHERE closed_at IS NOT NULL AND closed_at >= (CURDATE() - INTERVAL 6 DAY)
            GROUP BY DATE(closed_at)
            """
        )
        closed_rows = {str(r["day"]): r["closed"] for r in cursor.fetchall()}

        # Build a complete 7-day series (including days with zero activity)
        today = datetime.date.today()
        series = []
        for i in range(6, -1, -1):
            day = today - datetime.timedelta(days=i)
            key = str(day)
            series.append({
                "date":   key,
                "opened": opened_rows.get(key, 0),
                "closed": closed_rows.get(key, 0),
            })

        return jsonify(success=True, stats=series)
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e), stats=[]), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    """
    List all tickets (admin view).
    Joins with employees so the frontend gets the assigned employee name.
    Query params:
      ?status=Open|In Progress|Resolved|Closed   (filter by status)
      ?assign_to=<employee_id>                    (filter by assignee)
    """
    status_filter    = request.args.get("status")
    assignee_filter  = request.args.get("assign_to")

    base_query = """
        SELECT  t.ticket_id,
                t.subject,
                t.description,
                t.partner_name,
                t.request_mobile_number,
                t.page_name,
                t.category,
                t.remarks,
                t.status,
                t.assign_to,
                t.assigned_at,
                t.closed_at,
                e.employee_name  AS assigned_to_name,
                e.employee_code  AS assigned_to_code,
                t.created_at,
                t.updated_at
        FROM    tickets t
        LEFT JOIN employees e ON t.assign_to = e.employee_id
        WHERE 1=1
    """
    params = []
    if status_filter:
        base_query += " AND t.status = %s"
        params.append(status_filter)
    if assignee_filter:
        base_query += " AND t.assign_to = %s"
        params.append(int(assignee_filter))

    base_query += " ORDER BY t.created_at DESC"

    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        for row in rows:
            row["created_at"]  = str(row["created_at"])
            row["updated_at"]  = str(row["updated_at"])  if row["updated_at"]  else None
            row["assigned_at"] = str(row["assigned_at"]) if row["assigned_at"] else None
            row["closed_at"]   = str(row["closed_at"])   if row["closed_at"]   else None
        return jsonify(success=True, tickets=rows, count=len(rows))
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e), tickets=[]), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/tickets/<int:ticket_id>", methods=["GET"])
def get_ticket(ticket_id):
    """Get a single ticket's full details including attachments and activity log."""
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)

        # Main ticket
        cursor.execute(
            """
            SELECT  t.ticket_id, t.subject, t.description,
                    t.partner_name, t.request_mobile_number, t.page_name, t.category,
                    t.remarks, t.status, t.assign_to,
                    t.assigned_at, t.closed_at,
                    e.employee_name AS assigned_to_name,
                    e.employee_code AS assigned_to_code,
                    t.created_at, t.updated_at
            FROM    tickets t
            LEFT JOIN employees e ON t.assign_to = e.employee_id
            WHERE   t.ticket_id = %s
            """,
            (ticket_id,)
        )
        ticket = cursor.fetchone()
        if not ticket:
            return jsonify(success=False, message="Ticket not found."), 404
        ticket["created_at"]  = str(ticket["created_at"])
        ticket["updated_at"]  = str(ticket["updated_at"])  if ticket["updated_at"]  else None
        ticket["assigned_at"] = str(ticket["assigned_at"]) if ticket["assigned_at"] else None
        ticket["closed_at"]   = str(ticket["closed_at"])   if ticket["closed_at"]   else None

        # Attachments
        cursor.execute(
            "SELECT attachment_id, file_name, org_file_name, uploaded_at FROM ticket_attachments WHERE ticket_id = %s",
            (ticket_id,)
        )
        attachments = cursor.fetchall()
        for a in attachments:
            a["uploaded_at"] = str(a["uploaded_at"])

        # Activity log
        cursor.execute(
            """
            SELECT  ta.activity_id, ta.remarks, ta.created_at,
                    e.employee_name AS done_by
            FROM    ticket_activity ta
            LEFT JOIN employees e ON ta.assign_to = e.employee_id
            WHERE   ta.ticket_id = %s
            ORDER BY ta.created_at ASC
            """,
            (ticket_id,)
        )
        activity = cursor.fetchall()
        for a in activity:
            a["created_at"] = str(a["created_at"])

        ticket["attachments"] = attachments
        ticket["activity"]    = activity
        return jsonify(success=True, ticket=ticket)
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/tickets/<int:ticket_id>", methods=["PUT"])
def update_ticket(ticket_id):
    """
    Admin updates a ticket: assign to employee, change status, add remarks.
    Body (JSON): assign_to (employee_id), status, remarks   - all optional

    assigned_at is stamped the moment a ticket goes from unassigned -> assigned.
    closed_at   is stamped the moment a ticket's status becomes 'Closed'.
    """
    data = request.get_json()

    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)

        # Look at the ticket's current state first, so we know whether this
        # update represents a real "just got assigned" / "just got closed"
        # transition (rather than re-saving the same values).
        cursor.execute("SELECT assign_to, status FROM tickets WHERE ticket_id = %s", (ticket_id,))
        current = cursor.fetchone()
        if not current:
            return jsonify(success=False, message="Ticket not found."), 404

        fields, params = [], []
        if "assign_to" in data:
            fields.append("assign_to = %s")
            params.append(data["assign_to"])     # can be null to unassign
            if data["assign_to"] and not current["assign_to"]:
                fields.append("assigned_at = NOW()")
        if "status" in data:
            valid_statuses = ("Open", "In Progress", "Resolved", "Closed")
            if data["status"] not in valid_statuses:
                return jsonify(success=False, message=f"status must be one of {valid_statuses}"), 400
            fields.append("status = %s")
            params.append(data["status"])
            if data["status"] == "Closed" and current["status"] != "Closed":
                fields.append("closed_at = NOW()")
            elif data["status"] != "Closed" and current["status"] == "Closed":
                fields.append("closed_at = NULL")  # reopened
        if "remarks" in data:
            fields.append("remarks = %s")
            params.append(data["remarks"])

        if not fields:
            return jsonify(success=False, message="Nothing to update."), 400

        params.append(ticket_id)
        cursor.execute(
            f"UPDATE tickets SET {', '.join(fields)} WHERE ticket_id = %s",
            params
        )
        conn.commit()

        # Log the activity
        remark_text = data.get("remarks") or f"Status changed to {data.get('status', '')}"
        cursor.execute(
            "INSERT INTO ticket_activity (ticket_id, assign_to, remarks) VALUES (%s, %s, %s)",
            (ticket_id, data.get("assign_to"), remark_text)
        )
        conn.commit()
        return jsonify(success=True, message="Ticket updated.")
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass



# ═════════════════════════════════════════════════════════════════════════════
#  ATTACHMENTS API  (ticket_db)
# ═════════════════════════════════════════════════════════════════════════════

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)   # create uploads/ folder if it doesn't exist

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "xlsx", "txt"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/tickets/<int:ticket_id>/attachments", methods=["POST"])
def upload_attachment(ticket_id):
    """
    Customer uploads a file along with a ticket.
    Request: multipart/form-data with field name 'file'
    Stores file in uploads/ folder, saves metadata to ticket_attachments table.
    """
    if "file" not in request.files:
        return jsonify(success=False, message="No file part in the request. Use field name 'file'."), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify(success=False, message="No file selected."), 400

    if not allowed_file(file.filename):
        return jsonify(
            success=False,
            message=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        ), 400

    # Verify ticket exists first
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor()
        cursor.execute("SELECT ticket_id FROM tickets WHERE ticket_id = %s", (ticket_id,))
        if not cursor.fetchone():
            return jsonify(success=False, message="Ticket not found."), 404

        # Generate a unique filename using UUID to avoid name collisions on disk
        import uuid
        original_name = file.filename
        extension     = original_name.rsplit(".", 1)[1].lower()
        stored_name   = f"{uuid.uuid4().hex}.{extension}"   # e.g. a3f9c12d8e4b.pdf
        save_path     = os.path.join(UPLOAD_FOLDER, stored_name)

        # Save file to disk
        file.save(save_path)

        # Save metadata to DB
        cursor.execute(
            """
            INSERT INTO ticket_attachments (ticket_id, file_name, org_file_name)
            VALUES (%s, %s, %s)
            """,
            (ticket_id, original_name, stored_name)
        )
        conn.commit()
        attachment_id = cursor.lastrowid

        return jsonify(
            success=True,
            message="File uploaded successfully.",
            attachment_id=attachment_id,
            file_name=original_name,
            view_url=f"/api/attachments/{attachment_id}"
        ), 201

    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/attachments/<int:attachment_id>", methods=["GET"])
def download_attachment(attachment_id):
    """
    View / download an attachment by its ID.
    Opens the file directly in the browser (PDF, images) or downloads it (docs).
    """
    from flask import send_file
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT file_name, org_file_name FROM ticket_attachments WHERE attachment_id = %s",
            (attachment_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify(success=False, message="Attachment not found."), 404

        file_path = os.path.join(UPLOAD_FOLDER, row["org_file_name"])
        if not os.path.exists(file_path):
            return jsonify(success=False, message="File missing from server."), 404

        # as_attachment=False → opens in browser (good for PDF/images)
        # as_attachment=True  → forces download
        return send_file(file_path, download_name=row["file_name"], as_attachment=False)

    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


@app.route("/api/tickets/<int:ticket_id>/attachments", methods=["GET"])
def list_attachments(ticket_id):
    """List all attachments for a ticket with their view URLs."""
    try:
        conn   = get_ticket_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT attachment_id, file_name, uploaded_at FROM ticket_attachments WHERE ticket_id = %s",
            (ticket_id,)
        )
        rows = cursor.fetchall()
        for row in rows:
            row["uploaded_at"] = str(row["uploaded_at"])
            row["view_url"]    = f"/api/attachments/{row['attachment_id']}"
        return jsonify(success=True, attachments=rows, count=len(rows))
    except mysql.connector.Error as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  Run
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
