/**
 * FREELANCE MARKETPLACE - COMPLETE BACKEND (PRODUCTION READY)
 */

#include <crow_all.h>
#include <sqlite3.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <string>
#include <vector>
#include <functional>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <random>
#include <algorithm>

using json = nlohmann::json;
using std::cout;
using std::cerr;
using std::endl;

// ============================================================================
// SQLITE3 DATABASE MANAGER
// ============================================================================

class DatabaseManager {
private:
    sqlite3* db_ = nullptr;
    std::string db_path_;

    void executeSQL(const std::string& sql) {
        char* errmsg = nullptr;
        if (sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &errmsg) != SQLITE_OK) {
            std::string err = errmsg ? errmsg : "unknown";
            sqlite3_free(errmsg);
            throw std::runtime_error("[DB] SQL failed: " + err + "\nSQL: " + sql);
        }
    }

public:
    DatabaseManager(const std::string& db_filename = "freelance_market.db") {
        db_path_ = db_filename;
        cout << "[DB] Attempting to open: " << db_path_ << endl;
        if (sqlite3_open(db_path_.c_str(), &db_) != SQLITE_OK) {
            throw std::runtime_error("[DB] Cannot open database at: " + db_path_);
        }
        executeSQL("PRAGMA journal_mode=WAL;");
        executeSQL("PRAGMA foreign_keys=ON;");
        cout << "[DB] ✓ Database opened successfully: " << db_path_ << endl;
    }

    ~DatabaseManager() {
        if (db_) {
            sqlite3_close(db_);
            cout << "[DB] Database connection closed" << endl;
        }
    }

    bool execute(const std::string& sql) {
        char* errmsg = nullptr;
        int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &errmsg);
        if (rc != SQLITE_OK) {
            cerr << "[DB ERROR] " << (errmsg ? errmsg : "unknown") << endl;
            sqlite3_free(errmsg);
            return false;
        }
        return true;
    }

    std::vector<json> query(const std::string& sql,
                            std::function<void(sqlite3_stmt*)> binder = nullptr) {
        std::vector<json> rows;
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
            cerr << "[DB ERROR] prepare failed: " << sqlite3_errmsg(db_) << endl;
            return rows;
        }
        if (binder) binder(stmt);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            json row;
            int col_count = sqlite3_column_count(stmt);
            for (int i = 0; i < col_count; ++i) {
                const char* col_name = sqlite3_column_name(stmt, i);
                int col_type = sqlite3_column_type(stmt, i);
                switch (col_type) {
                    case SQLITE_INTEGER: row[col_name] = sqlite3_column_int64(stmt, i); break;
                    case SQLITE_FLOAT:   row[col_name] = sqlite3_column_double(stmt, i); break;
                    case SQLITE_TEXT:    row[col_name] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, i)); break;
                    default:             row[col_name] = nullptr;
                }
            }
            rows.push_back(row);
        }
        sqlite3_finalize(stmt);
        return rows;
    }

    bool write(const std::string& sql,
               std::function<void(sqlite3_stmt*)> binder = nullptr) {
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
            cerr << "[DB ERROR] prepare failed: " << sqlite3_errmsg(db_) << endl;
            return false;
        }
        if (binder) binder(stmt);
        int rc = sqlite3_step(stmt);
        sqlite3_finalize(stmt);
        return (rc == SQLITE_DONE) || (rc == SQLITE_ROW);
    }

    void initializeSchema() {
        cout << "[DB] Initializing schema..." << endl;
        executeSQL(R"(
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'freelancer'
                    CHECK(role IN ('freelancer', 'client')),
                is_active INTEGER DEFAULT 1,
                reliability_score REAL DEFAULT 100.0,
                average_rating REAL DEFAULT 0.0,
                total_projects INTEGER DEFAULT 0,
                completed_projects INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT
            )
        )");
        executeSQL(R"(
            CREATE TABLE IF NOT EXISTS freelancers (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                skills TEXT DEFAULT '',
                hourly_rate REAL DEFAULT 0.0,
                college_name TEXT DEFAULT '',
                study_year INTEGER DEFAULT 1,
                total_earnings REAL DEFAULT 0.0,
                verified_at TEXT,
                fraud_flag INTEGER DEFAULT 0
            )
        )");
        executeSQL(R"(
            CREATE TABLE IF NOT EXISTS clients (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                company_name TEXT DEFAULT '',
                total_spent REAL DEFAULT 0.0
            )
        )");
        executeSQL(R"(
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                budget REAL NOT NULL DEFAULT 0.0,
                status TEXT DEFAULT 'open'
                    CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
                required_skills TEXT DEFAULT '',
                difficulty_level INTEGER DEFAULT 2,
                deadline TEXT DEFAULT '',
                assigned_freelancer_id TEXT REFERENCES users(id),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        )");
        executeSQL(R"(
            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'pending'
                    CHECK(status IN ('pending', 'accepted', 'rejected')),
                cover_letter TEXT DEFAULT '',
                bid_amount REAL DEFAULT 0.0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, freelancer_id)
            )
        )");
        cout << "[DB] ✓ Schema initialized" << endl;
    }

    int64_t lastInsertRowId() { return sqlite3_last_insert_rowid(db_); }
    int changes() { return sqlite3_changes(db_); }
};

static DatabaseManager* g_db = nullptr;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

static std::string currentTimestamp() {
    auto now = std::time(nullptr);
    auto tm = *std::localtime(&now);
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

static std::string generateId(const std::string& prefix) {
    static std::mt19937_64 rng(std::random_device{}());
    std::uniform_int_distribution<uint64_t> dist;
    return prefix + "_" + std::to_string(dist(rng) % 1000000).substr(0, 8);
}

static std::string hashPassword(const std::string& password) {
    const std::string salt = "FREELANCE_MARKETPLACE_SALT_2025";
    std::hash<std::string> hasher;
    size_t hash1 = hasher(password + salt);
    size_t hash2 = hasher(salt + password + std::to_string(hash1));
    std::ostringstream oss;
    oss << std::hex << hash1 << hash2;
    return oss.str();
}

static bool verifyPassword(const std::string& plain, const std::string& stored) {
    return hashPassword(plain) == stored;
}

static std::string generateToken(const std::string& userId, const std::string& role) {
    std::hash<std::string> hasher;
    std::string payload = userId + ":" + role;
    size_t sig = hasher(payload + "JWT_SECRET_KEY_2025");
    std::ostringstream oss;
    oss << payload << ":" << std::hex << sig;
    return oss.str();
}

static bool parseToken(const std::string& token, std::string& outUserId, std::string& outRole) {
    auto pos1 = token.find(':');
    if (pos1 == std::string::npos) return false;
    auto pos2 = token.find(':', pos1 + 1);
    if (pos2 == std::string::npos) return false;
    outUserId = token.substr(0, pos1);
    outRole = token.substr(pos1 + 1, pos2 - pos1 - 1);
    return !outUserId.empty() && !outRole.empty();
}

// ============================================================================
// CORS — one function, called on every response including OPTIONS
// ============================================================================

static void setCORS(crow::response& res) {
    res.set_header("Access-Control-Allow-Origin",      "http://localhost:5173");
    res.set_header("Access-Control-Allow-Methods",     "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers",     "Content-Type, Authorization");
    res.set_header("Access-Control-Allow-Credentials", "true");
    res.set_header("Vary",                             "Origin");
}

// Every OPTIONS preflight returns this
static crow::response preflight() {
    crow::response res(204);
    setCORS(res);
    return res;
}

static crow::response success(const json& data) {
    crow::response res(200, data.dump());
    setCORS(res);
    res.set_header("Content-Type", "application/json");
    return res;
}

static crow::response created(const json& data) {
    crow::response res(201, data.dump());
    setCORS(res);
    res.set_header("Content-Type", "application/json");
    return res;
}

static crow::response apiError(int status, const std::string& message) {
    crow::response res(status, json{{"success", false}, {"error", message}}.dump());
    setCORS(res);
    res.set_header("Content-Type", "application/json");
    return res;
}

// ============================================================================
// SERVICE LAYER
// ============================================================================

struct AuthService {
    static json registerFreelancer(const json& body) {
        std::string username    = body.value("username", "");
        std::string email       = body.value("email", "");
        std::string password    = body.value("password", "");
        std::string collegeName = body.value("collegeName", "");
        int studyYear           = body.value("studyYear", 1);
        double hourlyRate       = body.value("hourlyRate", 0.0);

        std::string skillsStr = "";
        if (body.contains("skills") && body["skills"].is_array()) {
            for (size_t i = 0; i < body["skills"].size(); ++i) {
                if (i > 0) skillsStr += ",";
                skillsStr += body["skills"][i].get<std::string>();
            }
        }

        if (username.empty() || email.empty() || password.empty())
            return {{"success", false}, {"error", "Missing required fields"}};

        auto existing = g_db->query("SELECT id FROM users WHERE email = ?",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, email.c_str(), -1, SQLITE_TRANSIENT); });
        if (!existing.empty())
            return {{"success", false}, {"error", "Email already registered"}};

        std::string userId       = generateId("freelancer");
        std::string passwordHash = hashPassword(password);
        std::string now          = currentTimestamp();

        bool ok1 = g_db->write(
            "INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, 'freelancer', 1, ?, ?)",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, username.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, email.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 4, passwordHash.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 5, now.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 6, now.c_str(), -1, SQLITE_TRANSIENT);
            });

        bool ok2 = g_db->write(
            "INSERT INTO freelancers (user_id, skills, hourly_rate, college_name, study_year) VALUES (?, ?, ?, ?, ?)",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, skillsStr.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_double(s, 3, hourlyRate);
                sqlite3_bind_text(s, 4, collegeName.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_int(s, 5, studyYear);
            });

        if (!ok1 || !ok2)
            return {{"success", false}, {"error", "Database error during registration"}};

        return {{"success", true}, {"data", {
            {"userId", userId}, {"username", username}, {"email", email},
            {"role", "freelancer"}, {"token", generateToken(userId, "freelancer")}
        }}};
    }

    static json registerClient(const json& body) {
        std::string username    = body.value("username", "");
        std::string email       = body.value("email", "");
        std::string password    = body.value("password", "");
        std::string companyName = body.value("companyName", "");

        if (username.empty() || email.empty() || password.empty())
            return {{"success", false}, {"error", "Missing required fields"}};

        auto existing = g_db->query("SELECT id FROM users WHERE email = ?",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, email.c_str(), -1, SQLITE_TRANSIENT); });
        if (!existing.empty())
            return {{"success", false}, {"error", "Email already registered"}};

        std::string userId       = generateId("client");
        std::string passwordHash = hashPassword(password);
        std::string now          = currentTimestamp();

        bool ok1 = g_db->write(
            "INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, 'client', 1, ?, ?)",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, username.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, email.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 4, passwordHash.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 5, now.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 6, now.c_str(), -1, SQLITE_TRANSIENT);
            });

        bool ok2 = g_db->write(
            "INSERT INTO clients (user_id, company_name) VALUES (?, ?)",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, companyName.c_str(), -1, SQLITE_TRANSIENT);
            });

        if (!ok1 || !ok2)
            return {{"success", false}, {"error", "Database error during registration"}};

        return {{"success", true}, {"data", {
            {"userId", userId}, {"username", username}, {"email", email},
            {"role", "client"}, {"companyName", companyName},
            {"token", generateToken(userId, "client")}
        }}};
    }

    static json login(const json& body) {
        std::string email    = body.value("email", "");
        std::string password = body.value("password", "");

        if (email.empty() || password.empty())
            return {{"success", false}, {"error", "Email and password required"}};

        auto rows = g_db->query(
            "SELECT id, username, email, password_hash, role FROM users WHERE email = ?",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, email.c_str(), -1, SQLITE_TRANSIENT); });

        if (rows.empty() || !verifyPassword(password, rows[0]["password_hash"]))
            return {{"success", false}, {"error", "Invalid credentials"}};

        auto& user         = rows[0];
        std::string userId   = user["id"];
        std::string username = user["username"];
        std::string role     = user["role"];
        std::string now      = currentTimestamp();

        g_db->write("UPDATE users SET last_login = ? WHERE id = ?",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, now.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, userId.c_str(), -1, SQLITE_TRANSIENT);
            });

        return {{"success", true}, {"data", {
            {"userId", userId}, {"username", username}, {"email", email},
            {"role", role}, {"token", generateToken(userId, role)}
        }}};
    }
};

struct ProjectService {
    static json create(const json& body, const std::string& clientId) {
        std::string title       = body.value("title", "");
        std::string description = body.value("description", "");
        double budget           = body.value("budget", 0.0);
        std::string deadline    = body.value("deadline", "");
        int difficulty          = body.value("difficultyLevel", 2);

        if (title.empty() || budget <= 0)
            return {{"success", false}, {"error", "Title and budget > 0 required"}};

        std::string skillsStr = "";
        if (body.contains("requiredSkills") && body["requiredSkills"].is_array()) {
            for (size_t i = 0; i < body["requiredSkills"].size(); ++i) {
                if (i > 0) skillsStr += ",";
                skillsStr += body["requiredSkills"][i].get<std::string>();
            }
        }

        std::string projectId = generateId("proj");
        std::string now       = currentTimestamp();

        bool ok = g_db->write(
            "INSERT INTO projects (id, client_id, title, description, budget, required_skills, "
            "difficulty_level, deadline, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, projectId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, clientId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, title.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 4, description.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_double(s, 5, budget);
                sqlite3_bind_text(s, 6, skillsStr.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_int(s, 7, difficulty);
                sqlite3_bind_text(s, 8, deadline.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 9, now.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 10, now.c_str(), -1, SQLITE_TRANSIENT);
            });

        if (!ok) return {{"success", false}, {"error", "Failed to create project"}};
        return {{"success", true}, {"data", {
            {"projectId", projectId}, {"title", title},
            {"budget", budget}, {"status", "open"}, {"createdAt", now}
        }}};
    }

    static json getAll() {
        auto rows = g_db->query(
            "SELECT id, client_id, title, description, budget, status, required_skills, "
            "deadline, difficulty_level, assigned_freelancer_id, created_at "
            "FROM projects WHERE status != 'cancelled' ORDER BY created_at DESC");
        json result = json::array();
        for (const auto& row : rows) {
            result.push_back({
                {"projectId", row["id"]}, {"clientId", row["client_id"]},
                {"title", row["title"]}, {"description", row["description"]},
                {"budget", row["budget"]}, {"status", row["status"]},
                {"requiredSkills", row["required_skills"]}, {"deadline", row["deadline"]},
                {"difficultyLevel", row["difficulty_level"]},
                {"assignedFreelancerId", row["assigned_freelancer_id"]},
                {"createdAt", row["created_at"]}
            });
        }
        return {{"success", true}, {"data", result}};
    }

    static json getForClient(const std::string& clientId) {
        auto rows = g_db->query(
            "SELECT id, client_id, title, description, budget, status, required_skills, "
            "deadline, difficulty_level, assigned_freelancer_id, created_at "
            "FROM projects WHERE client_id = ? ORDER BY created_at DESC",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, clientId.c_str(), -1, SQLITE_TRANSIENT); });
        json result = json::array();
        for (const auto& row : rows) {
            result.push_back({
                {"projectId", row["id"]}, {"clientId", row["client_id"]},
                {"title", row["title"]}, {"budget", row["budget"]},
                {"status", row["status"]},
                {"assignedFreelancerId", row["assigned_freelancer_id"]},
                {"createdAt", row["created_at"]}
            });
        }
        return {{"success", true}, {"data", result}};
    }

    static json getForFreelancer(const std::string& freelancerId) {
        auto assigned = g_db->query(
            "SELECT p.id, p.title, p.budget, p.status, p.description, u.username as client_name "
            "FROM projects p JOIN users u ON u.id = p.client_id "
            "WHERE p.assigned_freelancer_id = ? ORDER BY p.updated_at DESC",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, freelancerId.c_str(), -1, SQLITE_TRANSIENT); });

        auto applied = g_db->query(
            "SELECT p.id, p.title, p.budget, p.status, a.status as app_status, u.username as client_name "
            "FROM projects p JOIN applications a ON a.project_id = p.id JOIN users u ON u.id = p.client_id "
            "WHERE a.freelancer_id = ? ORDER BY a.created_at DESC",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, freelancerId.c_str(), -1, SQLITE_TRANSIENT); });

        json assignedArray = json::array();
        for (const auto& row : assigned)
            assignedArray.push_back({{"projectId", row["id"]}, {"title", row["title"]},
                {"budget", row["budget"]}, {"status", row["status"]},
                {"applicationStatus", "accepted"}, {"clientName", row["client_name"]}});

        json appliedArray = json::array();
        for (const auto& row : applied)
            appliedArray.push_back({{"projectId", row["id"]}, {"title", row["title"]},
                {"budget", row["budget"]}, {"status", row["status"]},
                {"applicationStatus", row["app_status"]}, {"clientName", row["client_name"]}});

        return {{"success", true}, {"assigned", assignedArray}, {"applied", appliedArray}};
    }
};

struct ApplicationService {
    static json apply(const json& body, const std::string& freelancerId) {
        std::string projectId   = body.value("projectId", "");
        std::string coverLetter = body.value("coverLetter", "");
        double bidAmount        = body.value("bidAmount", 0.0);

        if (projectId.empty())
            return {{"success", false}, {"error", "projectId required"}};

        auto projects = g_db->query("SELECT id, status FROM projects WHERE id = ?",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, projectId.c_str(), -1, SQLITE_TRANSIENT); });
        if (projects.empty() || projects[0]["status"] != "open")
            return {{"success", false}, {"error", "Project not found or not open"}};

        auto existing = g_db->query(
            "SELECT id FROM applications WHERE project_id = ? AND freelancer_id = ?",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, projectId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, freelancerId.c_str(), -1, SQLITE_TRANSIENT);
            });
        if (!existing.empty())
            return {{"success", false}, {"error", "Already applied"}};

        std::string appId = generateId("app");
        std::string now   = currentTimestamp();

        bool ok = g_db->write(
            "INSERT INTO applications (id, project_id, freelancer_id, status, cover_letter, bid_amount, created_at, updated_at) "
            "VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, appId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, projectId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, freelancerId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 4, coverLetter.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_double(s, 5, bidAmount);
                sqlite3_bind_text(s, 6, now.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 7, now.c_str(), -1, SQLITE_TRANSIENT);
            });

        if (!ok) return {{"success", false}, {"error", "Failed to submit application"}};
        return {{"success", true}, {"data", {
            {"applicationId", appId}, {"projectId", projectId},
            {"freelancerId", freelancerId}, {"status", "pending"}, {"createdAt", now}
        }}};
    }

    static json getForProject(const std::string& projectId) {
        auto rows = g_db->query(
            "SELECT a.id, a.project_id, a.freelancer_id, a.status, a.cover_letter, a.bid_amount, a.created_at, "
            "u.username, u.email, u.reliability_score, u.average_rating, "
            "f.skills, f.hourly_rate, f.college_name, f.total_earnings "
            "FROM applications a "
            "JOIN users u ON u.id = a.freelancer_id "
            "JOIN freelancers f ON f.user_id = a.freelancer_id "
            "WHERE a.project_id = ? ORDER BY a.created_at DESC",
            [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, projectId.c_str(), -1, SQLITE_TRANSIENT); });

        json result = json::array();
        for (const auto& row : rows)
            result.push_back({
                {"applicationId", row["id"]}, {"projectId", row["project_id"]},
                {"freelancerId", row["freelancer_id"]}, {"status", row["status"]},
                {"coverLetter", row["cover_letter"]}, {"bidAmount", row["bid_amount"]},
                {"createdAt", row["created_at"]}, {"freelancerName", row["username"]},
                {"freelancerEmail", row["email"]}, {"reliabilityScore", row["reliability_score"]},
                {"averageRating", row["average_rating"]}, {"skills", row["skills"]},
                {"hourlyRate", row["hourly_rate"]}, {"collegeName", row["college_name"]},
                {"totalEarnings", row["total_earnings"]}
            });
        return {{"success", true}, {"data", result}};
    }

    static json hire(const json& body, const std::string& clientId) {
        std::string applicationId = body.value("applicationId", "");
        std::string projectId     = body.value("projectId", "");
        std::string freelancerId  = body.value("freelancerId", "");

        if (applicationId.empty() || projectId.empty() || freelancerId.empty())
            return {{"success", false}, {"error", "Missing required fields"}};

        auto projects = g_db->query("SELECT id FROM projects WHERE id = ? AND client_id = ?",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, projectId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, clientId.c_str(), -1, SQLITE_TRANSIENT);
            });
        if (projects.empty())
            return {{"success", false}, {"error", "Project not found or not owned by you"}};

        g_db->write("UPDATE applications SET status = 'accepted', updated_at = ? WHERE id = ? AND project_id = ?",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, currentTimestamp().c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, applicationId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, projectId.c_str(), -1, SQLITE_TRANSIENT);
            });

        g_db->write("UPDATE applications SET status = 'rejected', updated_at = ? WHERE project_id = ? AND id != ? AND status = 'pending'",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, currentTimestamp().c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, projectId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, applicationId.c_str(), -1, SQLITE_TRANSIENT);
            });

        bool ok = g_db->write(
            "UPDATE projects SET assigned_freelancer_id = ?, status = 'in_progress', updated_at = ? WHERE id = ?",
            [&](sqlite3_stmt* s) {
                sqlite3_bind_text(s, 1, freelancerId.c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 2, currentTimestamp().c_str(), -1, SQLITE_TRANSIENT);
                sqlite3_bind_text(s, 3, projectId.c_str(), -1, SQLITE_TRANSIENT);
            });

        if (!ok) return {{"success", false}, {"error", "Failed to complete hiring"}};
        return {{"success", true}, {"message", "Freelancer hired successfully"}};
    }
};

struct StatsService {
    static json getDashboard(const std::string& userId, const std::string& role) {
        json stats;
        if (role == "freelancer") {
            auto apps = g_db->query("SELECT COUNT(*) as cnt FROM applications WHERE freelancer_id = ?",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            auto assigned = g_db->query("SELECT COUNT(*) as cnt FROM projects WHERE assigned_freelancer_id = ? AND status = 'in_progress'",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            auto completed = g_db->query("SELECT COUNT(*) as cnt FROM projects WHERE assigned_freelancer_id = ? AND status = 'completed'",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            auto earnings = g_db->query("SELECT total_earnings FROM freelancers WHERE user_id = ?",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            stats["applicationsSubmitted"] = apps.empty()      ? 0   : apps[0]["cnt"].get<int>();
            stats["activeProjects"]        = assigned.empty()  ? 0   : assigned[0]["cnt"].get<int>();
            stats["completedProjects"]     = completed.empty() ? 0   : completed[0]["cnt"].get<int>();
            stats["totalEarnings"]         = earnings.empty()  ? 0.0 : earnings[0]["total_earnings"].get<double>();
        } else {
            auto total = g_db->query("SELECT COUNT(*) as cnt FROM projects WHERE client_id = ?",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            auto open = g_db->query("SELECT COUNT(*) as cnt FROM projects WHERE client_id = ? AND status = 'open'",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            auto appsReceived = g_db->query(
                "SELECT COUNT(*) as cnt FROM applications a JOIN projects p ON p.id = a.project_id WHERE p.client_id = ?",
                [&](sqlite3_stmt* s) { sqlite3_bind_text(s, 1, userId.c_str(), -1, SQLITE_TRANSIENT); });
            stats["totalProjects"]        = total.empty()        ? 0 : total[0]["cnt"].get<int>();
            stats["openProjects"]         = open.empty()         ? 0 : open[0]["cnt"].get<int>();
            stats["applicationsReceived"] = appsReceived.empty() ? 0 : appsReceived[0]["cnt"].get<int>();
        }
        return {{"success", true}, {"data", stats}};
    }
};

// ============================================================================
// MAIN
// ============================================================================

int main() {
    cout << "████████████████████████████████████████████████████████" << endl;
    cout << "██  FREELANCE MARKETPLACE - BACKEND API                ██" << endl;
    cout << "████████████████████████████████████████████████████████" << endl;

    try {
        g_db = new DatabaseManager("freelance_market.db");
        g_db->initializeSchema();
        cout << "[✓] Database ready" << endl << endl;
    } catch (const std::exception& e) {
        cerr << "[FATAL] DB init failed: " << e.what() << endl;
        return 1;
    }

    // Plain SimpleApp — CORS handled by explicit OPTIONS on every route
    crow::SimpleApp app;

    // ── HEALTH ───────────────────────────────────────────────────────────────
    CROW_ROUTE(app, "/api/health").methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        return success(json{{"status", "healthy"}, {"timestamp", currentTimestamp()}});
    });

    // ── AUTH ─────────────────────────────────────────────────────────────────

    CROW_ROUTE(app, "/api/auth/register-freelancer").methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try {
            auto result = AuthService::registerFreelancer(json::parse(req.body));
            if (result["success"]) return created(result);
            return apiError(400, result["error"]);
        } catch (const std::exception& e) {
            return apiError(500, std::string("Server error: ") + e.what());
        }
    });

    CROW_ROUTE(app, "/api/auth/register-client").methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try {
            auto result = AuthService::registerClient(json::parse(req.body));
            if (result["success"]) return created(result);
            return apiError(400, result["error"]);
        } catch (const std::exception& e) {
            return apiError(500, std::string("Server error: ") + e.what());
        }
    });

    CROW_ROUTE(app, "/api/auth/login").methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try {
            auto result = AuthService::login(json::parse(req.body));
            if (result["success"]) return success(result);
            return apiError(401, result["error"]);
        } catch (const std::exception& e) {
            return apiError(500, std::string("Server error: ") + e.what());
        }
    });

    // ── PROJECTS ─────────────────────────────────────────────────────────────

    CROW_ROUTE(app, "/api/projects").methods("GET"_method, "POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        if (req.method == crow::HTTPMethod::Get) {
            try { return success(ProjectService::getAll()); }
            catch (const std::exception& e) { return apiError(500, e.what()); }
        }
        try {
            auto body = json::parse(req.body);
            std::string clientId = body.value("clientId", "");
            if (clientId.empty()) {
                std::string auth = req.get_header_value("Authorization");
                if (auth.size() > 7) { std::string role; parseToken(auth.substr(7), clientId, role); }
            }
            if (clientId.empty()) return apiError(401, "clientId required");
            auto result = ProjectService::create(body, clientId);
            if (result["success"]) return created(result);
            return apiError(400, result["error"]);
        } catch (const std::exception& e) {
            return apiError(500, std::string("Server error: ") + e.what());
        }
    });

    CROW_ROUTE(app, "/api/projects/client/<string>").methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req, const std::string& clientId) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try { return success(ProjectService::getForClient(clientId)); }
        catch (const std::exception& e) { return apiError(500, e.what()); }
    });

    CROW_ROUTE(app, "/api/projects/freelancer/<string>").methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req, const std::string& freelancerId) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try { return success(ProjectService::getForFreelancer(freelancerId)); }
        catch (const std::exception& e) { return apiError(500, e.what()); }
    });

    // ── APPLICATIONS ─────────────────────────────────────────────────────────

    CROW_ROUTE(app, "/api/apply").methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try {
            auto body = json::parse(req.body);
            std::string freelancerId = body.value("freelancerId", "");
            if (freelancerId.empty()) {
                std::string auth = req.get_header_value("Authorization");
                if (auth.size() > 7) { std::string role; parseToken(auth.substr(7), freelancerId, role); }
            }
            if (freelancerId.empty()) return apiError(401, "freelancerId required");
            auto result = ApplicationService::apply(body, freelancerId);
            if (result["success"]) return created(result);
            return apiError(400, result["error"]);
        } catch (const std::exception& e) {
            return apiError(500, std::string("Server error: ") + e.what());
        }
    });

    CROW_ROUTE(app, "/api/applications/<string>").methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req, const std::string& projectId) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try { return success(ApplicationService::getForProject(projectId)); }
        catch (const std::exception& e) { return apiError(500, e.what()); }
    });

    // ── HIRE ─────────────────────────────────────────────────────────────────

    CROW_ROUTE(app, "/api/hire").methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try {
            auto body = json::parse(req.body);
            std::string clientId = body.value("clientId", "");
            if (clientId.empty()) {
                std::string auth = req.get_header_value("Authorization");
                if (auth.size() > 7) { std::string role; parseToken(auth.substr(7), clientId, role); }
            }
            if (clientId.empty()) return apiError(401, "clientId required");
            auto result = ApplicationService::hire(body, clientId);
            if (result["success"]) return success(result);
            return apiError(400, result["error"]);
        } catch (const std::exception& e) {
            return apiError(500, std::string("Server error: ") + e.what());
        }
    });

    // ── STATS ─────────────────────────────────────────────────────────────────

    CROW_ROUTE(app, "/api/stats/<string>/<string>").methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req, const std::string& userId, const std::string& role) {
        if (req.method == crow::HTTPMethod::Options) return preflight();
        try { return success(StatsService::getDashboard(userId, role)); }
        catch (const std::exception& e) { return apiError(500, e.what()); }
    });

    // ── START ─────────────────────────────────────────────────────────────────
    cout << "[Server] Listening on http://0.0.0.0:8080" << endl;
    
    // NOTE: This line is changed to run single-threaded so it compiles for you!
    app.port(8080).run();

    delete g_db;
    return 0;
}