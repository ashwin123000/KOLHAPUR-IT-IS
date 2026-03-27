# Freelancer Marketplace - Complete Database Schema

## SQLite Database Schema (Can be adapted to MySQL)

```sql
-- =====================================================
-- USERS TABLE (Base Classes: User -> Client/Freelancer)
-- =====================================================

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('CLIENT', 'FREELANCER', 'ADMIN')),
    phoneNumber TEXT,
    profilePhotoUrl TEXT,
    bio TEXT,
    isActive BOOLEAN DEFAULT 1,
    reliabilityScore REAL DEFAULT 100.0 CHECK(reliabilityScore >= 0 AND reliabilityScore <= 100),
    totalProjects INTEGER DEFAULT 0,
    completedProjects INTEGER DEFAULT 0,
    failedProjects INTEGER DEFAULT 0,
    averageRating REAL DEFAULT 0.0 CHECK(averageRating >= 0 AND averageRating <= 5),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    lastActiveAt TEXT NOT NULL,
    UNIQUE(email, role)  -- Email unique per role
);

-- =====================================================
-- CLIENTS TABLE (Inherits from users)
-- =====================================================

CREATE TABLE clients (
    clientId TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    companyName TEXT,
    companyWebsite TEXT,
    industry TEXT,
    verificationLevel INTEGER DEFAULT 0 CHECK(verificationLevel BETWEEN 0 AND 3),
    totalSpent REAL DEFAULT 0.0,
    averageProjectBudget REAL DEFAULT 0.0,
    paymentDelays INTEGER DEFAULT 0,
    successfulProjects INTEGER DEFAULT 0,
    disputeHistory INTEGER DEFAULT 0,
    fraudFlag TEXT DEFAULT 'trusted' CHECK(fraudFlag IN ('trusted', 'risky', 'flagged')),
    createdAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- FREELANCERS TABLE (Inherits from users)
-- =====================================================

CREATE TABLE freelancers (
    freelancerId TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    skills TEXT,  -- JSON array: ["JavaScript", "React", "Node.js"]
    portfolio TEXT,  -- JSON array of portfolio URLs
    collegeName TEXT,
    studyYear INTEGER DEFAULT 1,
    isVerified BOOLEAN DEFAULT 0,
    fraudDetectionFlag INTEGER DEFAULT 0 CHECK(fraudDetectionFlag BETWEEN 0 AND 2),
    hourlyRate REAL DEFAULT 0.0,
    deadlinesMet INTEGER DEFAULT 0,
    deadlinesMissed INTEGER DEFAULT 0,
    incompleteProjects INTEGER DEFAULT 0,
    totalEarnings REAL DEFAULT 0.0,
    experienceLevel INTEGER DEFAULT 1 CHECK(experienceLevel BETWEEN 1 AND 5),
    activityScore INTEGER DEFAULT 100 CHECK(activityScore BETWEEN 0 AND 100),
    createdAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================

CREATE TABLE projects (
    projectId TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    budget REAL NOT NULL CHECK(budget > 0),
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
    requiredSkills TEXT,  -- JSON array
    difficultyLevel INTEGER DEFAULT 1 CHECK(difficultyLevel BETWEEN 1 AND 5),
    awardedToFreelancerId TEXT,
    deadlineTimestamp INTEGER,
    daysLate INTEGER DEFAULT 0,
    requiresSpecificCollege BOOLEAN DEFAULT 0,
    requiredCollege TEXT,
    requiresSpecificYear BOOLEAN DEFAULT 0,
    requiredYear INTEGER,
    bidCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    completedAt TEXT,
    FOREIGN KEY (clientId) REFERENCES clients(clientId),
    FOREIGN KEY (awardedToFreelancerId) REFERENCES freelancers(freelancerId),
    INDEX idx_status (status),
    INDEX idx_clientId (clientId)
);

-- =====================================================
-- MILESTONES TABLE
-- =====================================================

CREATE TABLE milestones (
    milestoneId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    budget REAL NOT NULL,
    deadlineTimestamp INTEGER,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'approved')),
    orderIndex INTEGER,
    createdAt TEXT,
    completedAt TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(projectId) ON DELETE CASCADE,
    INDEX idx_projectId (projectId)
);

-- =====================================================
-- BIDS TABLE
-- =====================================================

CREATE TABLE bids (
    bidId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    freelancerId TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    proposal TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    proposedDeadlineTimestamp INTEGER,
    proposedDuration INTEGER,  -- days
    createdAt TEXT NOT NULL,
    respondedAt TEXT,
    skillMatchScore REAL DEFAULT 0.0 CHECK(skillMatchScore BETWEEN 0 AND 100),
    timelineScore REAL DEFAULT 0.0 CHECK(timelineScore BETWEEN 0 AND 100),
    priceValueScore REAL DEFAULT 0.0 CHECK(priceValueScore BETWEEN 0 AND 100),
    isHighlightedBudgetOption BOOLEAN DEFAULT 0,
    isHighlightedBestValue BOOLEAN DEFAULT 0,
    FOREIGN KEY (projectId) REFERENCES projects(projectId) ON DELETE CASCADE,
    FOREIGN KEY (freelancerId) REFERENCES freelancers(freelancerId) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_projectId (projectId)
);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

CREATE TABLE payments (
    paymentId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    freelancerId TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
    paymentMethod TEXT CHECK(paymentMethod IN ('credit_card', 'bank_transfer', 'wallet', 'escrow')),
    createdAt INTEGER,
    paidAt INTEGER,
    completionDeadline INTEGER,
    transactionId TEXT,
    description TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(projectId),
    FOREIGN KEY (clientId) REFERENCES clients(clientId),
    FOREIGN KEY (freelancerId) REFERENCES freelancers(freelancerId),
    INDEX idx_status (status),
    INDEX idx_projectId (projectId)
);

-- =====================================================
-- ESCROW ACCOUNTS TABLE
-- =====================================================

CREATE TABLE escrowAccounts (
    escrowId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL UNIQUE,
    clientId TEXT NOT NULL,
    freelancerId TEXT NOT NULL,
    totalAmount REAL NOT NULL,
    releasedAmount REAL DEFAULT 0.0,
    holdAmount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'released', 'disputed', 'closed')),
    createdAt INTEGER,
    releaseDate INTEGER,
    description TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(projectId),
    FOREIGN KEY (clientId) REFERENCES clients(clientId),
    FOREIGN KEY (freelancerId) REFERENCES freelancers(freelancerId)
);

-- =====================================================
-- INVOICES TABLE
-- =====================================================

CREATE TABLE invoices (
    invoiceId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    freelancerId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    totalAmount REAL NOT NULL,
    amountPaid REAL DEFAULT 0.0,
    amountDue REAL DEFAULT 0.0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
    invoiceDate INTEGER,
    dueDate INTEGER,
    paidDate INTEGER,
    description TEXT,
    lineItems TEXT,  -- JSON array of {description, amount}
    FOREIGN KEY (projectId) REFERENCES projects(projectId),
    FOREIGN KEY (freelancerId) REFERENCES freelancers(freelancerId),
    FOREIGN KEY (clientId) REFERENCES clients(clientId),
    INDEX idx_status (status)
);

-- =====================================================
-- ACTIVITY LOGS TABLE
-- =====================================================

CREATE TABLE activityLogs (
    logId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,  -- "created", "milestoneCompleted", "bidAccepted", etc.
    description TEXT,
    timestamp TEXT,
    metadata TEXT,  -- JSON for additional context
    FOREIGN KEY (projectId) REFERENCES projects(projectId) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id),
    INDEX idx_projectId (projectId),
    INDEX idx_userId (userId)
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE notifications (
    notificationId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT CHECK(type IN ('bid', 'milestone', 'payment', 'deadline', 'message', 'system')),
    relatedEntityId TEXT,
    relatedEntityType TEXT,
    isRead BOOLEAN DEFAULT 0,
    createdAt INTEGER,
    actionUrl TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_isRead (isRead)
);

-- =====================================================
-- CHAT ROOMS TABLE
-- =====================================================

CREATE TABLE chatRooms (
    chatRoomId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL UNIQUE,
    clientId TEXT NOT NULL,
    freelancerId TEXT NOT NULL,
    lastMessageId TEXT,
    lastMessageTime INTEGER,
    createdAt INTEGER,
    isActive BOOLEAN DEFAULT 1,
    FOREIGN KEY (projectId) REFERENCES projects(projectId),
    FOREIGN KEY (clientId) REFERENCES clients(clientId),
    FOREIGN KEY (freelancerId) REFERENCES freelancers(freelancerId)
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE messages (
    messageId TEXT PRIMARY KEY,
    chatRoomId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    content TEXT NOT NULL,
    sentAt INTEGER,
    isRead BOOLEAN DEFAULT 0,
    attachmentUrl TEXT,
    messageType TEXT DEFAULT 'text' CHECK(messageType IN ('text', 'file', 'image', 'system')),
    FOREIGN KEY (chatRoomId) REFERENCES chatRooms(chatRoomId) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES users(id),
    INDEX idx_chatRoomId (chatRoomId)
);

-- =====================================================
-- ACTIVE PARTICIPANTS (for real-time tracking)
-- =====================================================

CREATE TABLE chatRoomParticipants (
    chatRoomId TEXT NOT NULL,
    userId TEXT NOT NULL,
    isActive BOOLEAN DEFAULT 1,
    lastSeen INTEGER,
    PRIMARY KEY (chatRoomId, userId),
    FOREIGN KEY (chatRoomId) REFERENCES chatRooms(chatRoomId),
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_isActive ON users(isActive);
CREATE INDEX idx_projects_status_deadline ON projects(status, deadlineTimestamp);
CREATE INDEX idx_bids_status_project ON bids(status, projectId);
CREATE INDEX idx_payments_projectId_status ON payments(projectId, status);
```

## Key Design Patterns Used:

1. **Inheritance in Relational Database**: `users` table serves as base, with `clients` and `freelancers` having foreign keys
2. **JSON Storage**: Skills, portfolio, and metadata stored as JSON for flexibility
3. **Audit Trail**: `createdAt`, `updatedAt`, `lastActiveAt` timestamps track lifecycle
4. **Denormalization**: Calculated fields like `reliabilityScore`, `totalSpent` for query performance
5. **Cascading Deletes**: ON DELETE CASCADE ensures referential integrity
6. **Check Constraints**: Validate data at database level (enum values, ranges)
7. **Indexes**: Strategic indexes on frequently queried columns

## Initialization Script

Run this script to create all tables:

```bash
sqlite3 freelance_platform.db < database_schema.sql
```
