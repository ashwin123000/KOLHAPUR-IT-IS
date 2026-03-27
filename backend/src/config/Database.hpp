#pragma once

#include <sqlite3.h>
#include <string>
#include <memory>
#include <stdexcept>
#include <iostream>
#include <vector>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// ==================== DATABASE SINGLETON ====================
/**
 * @class Database
 * @brief Singleton pattern for SQLite database connection and management
 * Handles schema initialization and query execution
 */
class Database {
private:
    static Database* instance;
    sqlite3* db;
    std::string dbPath;

    Database(const std::string& path = "freelance_platform.db") : dbPath(path), db(nullptr) {
        initializeConnection();
    }

    void initializeConnection() {
        int rc = sqlite3_open(dbPath.c_str(), &db);
        if (rc) {
            throw std::runtime_error(std::string("Cannot open database: ") + sqlite3_errmsg(db));
        }
        // Enable foreign key constraints
        sqlite3_exec(db, "PRAGMA foreign_keys = ON;", nullptr, nullptr, nullptr);
        std::cout << "[DB] SQLite connection established: " << dbPath << std::endl;
    }

public:
    ~Database() {
        if (db) {
            sqlite3_close(db);
            std::cout << "[DB] SQLite connection closed" << std::endl;
        }
    }

    static Database* getInstance(const std::string& path = "freelance_platform.db") {
        if (!instance) {
            instance = new Database(path);
        }
        return instance;
    }

    sqlite3* getConnection() { return db; }

    // ==================== SCHEMA INITIALIZATION ====================
    void initializeSchema() {
        std::cout << "[DB] Initializing database schema..." << std::endl;

        std::vector<std::string> createStatements = {
            // Users table (base for polymorphism)
            R"(
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    phone_number TEXT,
                    profile_photo_url TEXT,
                    bio TEXT,
                    role TEXT NOT NULL CHECK(role IN ('freelancer', 'client', 'admin')),
                    is_active BOOLEAN DEFAULT 1,
                    reliability_score REAL DEFAULT 100.0 CHECK(reliability_score >= 0 AND reliability_score <= 100),
                    total_projects INTEGER DEFAULT 0,
                    completed_projects INTEGER DEFAULT 0,
                    failed_projects INTEGER DEFAULT 0,
                    average_rating REAL DEFAULT 0.0 CHECK(average_rating >= 0 AND average_rating <= 5),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            )",

            // Clients table (inherits from users)
            R"(
                CREATE TABLE IF NOT EXISTS clients (
                    user_id TEXT PRIMARY KEY,
                    company_name TEXT,
                    verification_level INTEGER DEFAULT 0 CHECK(verification_level IN (0, 1, 2, 3)),
                    payment_delays_count INTEGER DEFAULT 0,
                    fraud_flag_count INTEGER DEFAULT 0,
                    dispute_count INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            )",

            // Freelancers table (inherits from users)
            R"(
                CREATE TABLE IF NOT EXISTS freelancers (
                    user_id TEXT PRIMARY KEY,
                    skills TEXT NOT NULL,
                    hourly_rate REAL DEFAULT 0.0,
                    college_name TEXT,
                    college_year TEXT,
                    portfolio_url TEXT,
                    verification_level INTEGER DEFAULT 0 CHECK(verification_level IN (0, 1, 2, 3)),
                    fraud_flag INTEGER DEFAULT 0 CHECK(fraud_flag IN (0, 1, 2)),
                    deadlines_met INTEGER DEFAULT 0,
                    deadlines_missed INTEGER DEFAULT 0,
                    earnings REAL DEFAULT 0.0,
                    stripe_account_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            )",

            // Projects table
            R"(
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    budget REAL NOT NULL CHECK(budget > 0),
                    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
                    required_skills TEXT NOT NULL,
                    difficulty_level INTEGER DEFAULT 2 CHECK(difficulty_level IN (1, 2, 3, 4, 5)),
                    deadline DATETIME NOT NULL,
                    assigned_freelancer_id TEXT,
                    visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(client_id) REFERENCES clients(user_id) ON DELETE CASCADE,
                    FOREIGN KEY(assigned_freelancer_id) REFERENCES freelancers(user_id) ON DELETE SET NULL,
                    INDEX idx_client_id (client_id),
                    INDEX idx_status (status)
                )
            )",

            // Milestones table
            R"(
                CREATE TABLE IF NOT EXISTS milestones (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    budget REAL NOT NULL CHECK(budget > 0),
                    deadline DATETIME NOT NULL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
                    completion_date DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            )",

            // Bids table
            R"(
                CREATE TABLE IF NOT EXISTS bids (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    freelancer_id TEXT NOT NULL,
                    amount REAL NOT NULL CHECK(amount > 0),
                    proposal TEXT,
                    timeline_days INTEGER NOT NULL CHECK(timeline_days > 0),
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
                    skill_score REAL DEFAULT 0.0 CHECK(skill_score >= 0 AND skill_score <= 100),
                    timeline_score REAL DEFAULT 0.0 CHECK(timeline_score >= 0 AND timeline_score <= 100),
                    price_value_score REAL DEFAULT 0.0 CHECK(price_value_score >= 0 AND price_value_score <= 100),
                    overall_score REAL DEFAULT 0.0 CHECK(overall_score >= 0 AND overall_score <= 100),
                    is_highlighted BOOLEAN DEFAULT 0,
                    highlight_reason TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY(freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
                )
            )",

            // Payments table
            R"(
                CREATE TABLE IF NOT EXISTS payments (
                    id TEXT PRIMARY KEY,
                    milestone_id TEXT,
                    amount REAL NOT NULL CHECK(amount > 0),
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
                    payment_method TEXT CHECK(payment_method IN ('stripe', 'paypal', 'bank_transfer')),
                    transaction_id TEXT UNIQUE,
                    payer_id TEXT NOT NULL,
                    payee_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
                    FOREIGN KEY(payer_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY(payee_id) REFERENCES users(id) ON DELETE CASCADE
                )
            )",

            // Escrow accounts table
            R"(
                CREATE TABLE IF NOT EXISTS escrow_accounts (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL UNIQUE,
                    total_amount REAL DEFAULT 0.0 CHECK(total_amount >= 0),
                    released_amount REAL DEFAULT 0.0 CHECK(released_amount >= 0),
                    hold_amount REAL DEFAULT 0.0 CHECK(hold_amount >= 0),
                    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'released', 'disputed', 'refunded')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    released_at DATETIME,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            )",

            // Invoices table
            R"(
                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    freelancer_id TEXT NOT NULL,
                    total_amount REAL NOT NULL CHECK(total_amount >= 0),
                    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
                    due_date DATETIME,
                    paid_amount REAL DEFAULT 0.0 CHECK(paid_amount >= 0),
                    paid_date DATETIME,
                    is_overdue BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY(freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
                )
            )",

            // Notifications table
            R"(
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('bid_received', 'project_assigned', 'payment_released', 'message_received', 'deadline_reminder', 'fraud_alert')),
                    title TEXT NOT NULL,
                    message TEXT,
                    action_url TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    related_entity_id TEXT,
                    related_entity_type TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    read_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            )",

            // Chat rooms table
            R"(
                CREATE TABLE IF NOT EXISTS chat_rooms (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL UNIQUE,
                    participants TEXT NOT NULL,
                    last_message_id TEXT,
                    last_message_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            )",

            // Messages table
            R"(
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    chat_room_id TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'file', 'image')),
                    attachment_url TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    read_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
                    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
                )
            )",

            // Activity logs table (audit trail)
            R"(
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    description TEXT,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            )"
        };

        for (const auto& stmt : createStatements) {
            if (!stmt.empty()) {
                execute(stmt);
            }
        }

        std::cout << "[DB] Schema initialization complete" << std::endl;
    }

    // ==================== QUERY EXECUTION ====================
    bool execute(const std::string& sql) {
        char* errMsg = nullptr;
        int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg);
        
        if (rc != SQLITE_OK) {
            std::cerr << "[DB ERROR] SQL error: " << errMsg << std::endl;
            sqlite3_free(errMsg);
            return false;
        }
        return true;
    }

    std::vector<json> executeQuery(const std::string& sql) {
        std::vector<json> results;
        sqlite3_stmt* stmt;
        
        int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
        if (rc != SQLITE_OK) {
            std::cerr << "[DB ERROR] Query failed: " << sqlite3_errmsg(db) << std::endl;
            return results;
        }

        while (sqlite3_step(stmt) == SQLITE_ROW) {
            json row;
            int colCount = sqlite3_column_count(stmt);
            
            for (int i = 0; i < colCount; i++) {
                const char* colName = sqlite3_column_name(stmt, i);
                int colType = sqlite3_column_type(stmt, i);
                
                if (colType == SQLITE_INTEGER) {
                    row[colName] = sqlite3_column_int(stmt, i);
                } else if (colType == SQLITE_FLOAT) {
                    row[colName] = sqlite3_column_double(stmt, i);
                } else if (colType == SQLITE_TEXT) {
                    row[colName] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, i)));
                } else if (colType == SQLITE_NULL) {
                    row[colName] = nullptr;
                }
            }
            results.push_back(row);
        }

        sqlite3_finalize(stmt);
        return results;
    }

    bool executeInsert(const std::string& sql) {
        return execute(sql);
    }

    bool executeUpdate(const std::string& sql) {
        return execute(sql);
    }

    bool executeDelete(const std::string& sql) {
        return execute(sql);
    }

    int getLastInsertRowId() {
        return static_cast<int>(sqlite3_last_insert_rowid(db));
    }

    int GetChanges() {
        return sqlite3_changes(db);
    }
};

// Initialize static instance
Database* Database::instance = nullptr;
