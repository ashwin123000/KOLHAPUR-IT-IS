<<<<<<< HEAD
# CPP-ACSES-
=======
# 🚀 Freelancer Marketplace System - Complete Documentation

A **production-level**, **full-stack freelance marketplace** system with:
- **React Frontend** - Modern, responsive UI with real-time features
- **C++ Backend** - High-performance server using Crow framework with strict OOP architecture
- **SQLite/MySQL** - Relational database with comprehensive schema
- **AI Matching Engine** - Intelligent freelancer-project matching system

---

## 🎯 System Overview

### Architecture Layers

```
┌──────────────────────────────────────────┐
│         React Frontend (UI Layer)         │
├──────────────────────────────────────────┤
│         REST API Communication            │
├──────────────────────────────────────────┤
│    Controller Layer (API Endpoints)       │
├──────────────────────────────────────────┤
│    Service Layer (Business Logic)         │
│  - UserService                           │
│  - ProjectService                        │
│  - BidService                            │
│  - MatchingEngine                        │
│  - PaymentService                        │
│  - NotificationService                   │
├──────────────────────────────────────────┤
│  Repository/DAO Layer (Data Access)       │
│  - UserRepository                        │
│  - ProjectRepository                     │
│  - PaymentRepository                     │
│  - NotificationRepository                │
├──────────────────────────────────────────┤
│    Model Layer (Domain Objects)           │
│  - User/Client/Freelancer                │
│  - Project/Milestone                     │
│  - Bid/Payment/Invoice                   │
│  - Notification/Message                  │
├──────────────────────────────────────────┤
│  SQLite/MySQL Database (Persistence)     │
└──────────────────────────────────────────┘
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Complete SQLite schema with 12 tables, relationships, and constraints |
| [API_ENDPOINTS.md](API_ENDPOINTS.md) | REST API documentation with 27+ endpoints, request/response examples |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Frontend-backend integration guide with code examples |

---

## 💡 Key Features

### 1. **User System**
- ✅ Role-based authentication (Client/Freelancer)
- ✅ Profile management with verification levels
- ✅ Reliability scores based on project history
- ✅ Fraud detection system with flags
- ✅ Activity tracking and status updates

### 2. **Project Management**
- ✅ Create, read, update, delete projects
- ✅ Milestone-based task management
- ✅ Activity timeline logging every action
- ✅ Deadline tracking with late penalties
- ✅ Status transitions (open → in_progress → completed)

### 3. **Intelligent Matching System**
- ✅ **Skill Analysis**: Calculates skill match percentage
- ✅ **Reliability Calculation**: Scores based on past performance
- ✅ **Overall Scoring**: Weighted algorithm (40% skill, 35% reliability, 25% activity)
- ✅ **Eligibility Filter**: Rejects flagged/inactive freelancers
- ✅ **Budget Validation**: Ensures freelancer rates match project budget

### 4. **Bid Management**
- ✅ Submit and manage bids on projects
- ✅ Automatic bid scoring and ranking
- ✅ Highlight best value and budget options
- ✅ Accept, reject, or shortlist bids
- ✅ Skill gap analysis

### 5. **Payment & Escrow**
- ✅ Secure escrow account management
- ✅ Milestone-based fund release
- ✅ Invoice generation and tracking
- ✅ Payment history and statistics
- ✅ Multi-status tracking (pending, processing, paid)

### 6. **Real-Time Communication**
- ✅ Project-based chat rooms
- ✅ Real-time message delivery
- ✅ Active user tracking
- ✅ Message read status
- ✅ Notification system

### 7. **Analytics Dashboard**
- ✅ Earnings and spend graphs
- ✅ Project statistics
- ✅ Freelancer performance metrics
- ✅ Skill demand analysis

---

## 🏗️ Project Structure

```
freelance_platform/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── BaseModel.hpp          # Abstract base
│   │   │   ├── User.hpp               # User hierarchy
│   │   │   ├── Project.hpp            # Projects & Bids
│   │   │   ├── Payment.hpp            # Payments & Escrow
│   │   │   └── Notification.hpp       # Notifications & Chat
│   │   ├── repositories/
│   │   │   ├── IRepository.hpp        # Generic interface
│   │   │   ├── UserRepository.hpp     # User persistence
│   │   │   ├── ProjectRepository.hpp  # Project persistence
│   │   │   └── PaymentRepository.hpp  # Payment persistence
│   │   ├── services/
│   │   │   ├── UserService.hpp        # User business logic
│   │   │   ├── ProjectService.hpp     # Project business logic
│   │   │   ├── MatchingEngine.hpp     # AI matching system
│   │   │   └── PaymentService.hpp     # Payment business logic
│   │   ├── controllers/
│   │   │   ├── AuthController.hpp     # Auth endpoints
│   │   │   ├── ProjectController.hpp  # Project endpoints
│   │   │   └── BIDMANAGER_CLIENT.hpp  # Legacy controller
│   │   ├── middleware/
│   │   │   └── AuthMiddleware.hpp     # JWT verification
│   │   ├── utils/
│   │   │   └── ResponseUtils.hpp      # Response formatting
│   │   ├── config/
│   │   │   └── Database.hpp           # DB configuration
│   │   └── main.cpp                   # Application entry point
│   ├── CMakeLists.txt
│   └── vcpkg.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ClientSidebar.jsx
│   │   │   ├── FreelancerSidebar.jsx
│   │   │   ├── HomeNavbar.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Layouts.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── ClientDashboard.jsx
│   │   │   ├── FreelancerDashboard.jsx
│   │   │   ├── Clientprojects.jsx
│   │   │   ├── JobBrowsing.jsx
│   │   │   ├── FreelancerRecommendations.jsx
│   │   │   └── InvoicePage.jsx
│   │   ├── services/
│   │   │   └── api.js                 # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── DATABASE_SCHEMA.md                 # Complete SQL schema
├── API_ENDPOINTS.md                   # REST API documentation
├── INTEGRATION_GUIDE.md               # Frontend-Backend integration
└── README.md                          # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (for frontend)
- C++17 compiler (for backend)
- CMake 3.16+

### Backend Setup

```bash
cd backend

# Install dependencies with vcpkg
vcpkg install crow nlohmann-json

# Build
mkdir build && cd build
cmake ..
cmake --build . --config Release

# Run
./FreelancePlatform
```

Backend runs on `http://localhost:8080`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 📊 API Overview

| Category | Count | Examples |
|----------|-------|----------|
| **Authentication** | 3 | Register, Login, Logout |
| **Projects** | 5 | List, Create, Get, Update, Delete |
| **Bids** | 5 | Submit, Get, Accept, Reject, Score |
| **Matching** | 3 | Get Matches, Skill Gap, Analytics |
| **Payments** | 6 | Initiate, Get, Release, Invoice |
| **Notifications** | 3 | Get, Mark Read, Delete |
| **Chat** | 3 | Get Messages, Send, Typing Status |
| **Stats** | 2 | Dashboard, User Profile |

**Total: 27+ REST endpoints**

See [API_ENDPOINTS.md](API_ENDPOINTS.md) for complete documentation.

---

## 🎯 Business Logic

### Reliability Score Calculation

```
Base Score: 100.0

+ (Deadlines Met × 2)              // +2 per deadline met
- (Deadlines Missed × 15)          // -15 per deadline missed
- (Incomplete Projects × 20)       // -20 per incomplete project
+ (Verified ? 15 : 0)              // +15 if verified
- (Fraud Flag × 25)                // -25 or -50 if flagged

Scale by Activity Score (0-100%)

Result: 0-100 (bounded)
```

### Matching Algorithm

```
Skill Score (0-100)
  = (Matched Skills / Required Skills) × 100

Reliability Score (0-100)
  = User's calculated reliability score

Activity Score (0-100)
  = User's activity percentage

Overall Score (0-100)
  = (Skill × 0.40) + (Reliability × 0.35) + (Activity × 0.25)

Eligibility Filters:
  ✓ Not fraud flagged  
  ✓ Verified status
  ✓ Minimum reliability threshold
  ✓ Within budget constraints
```

### Bid Scoring

```
Skill Match Score (40% weight)
  = (Matching Skills / Required Skills) × 100

Timeline Score (30% weight)
  = Value assessment based on proposed deadline

Price Value Score (30% weight)
  = Value assessment based on budget vs bid amount

Overall Bid Score
  = (Skill × 0.40) + (Timeline × 0.30) + (Price × 0.30)

Highlighting:
  - "Best Value": Highest overall score
  - "Budget Option": Lowest price within quality threshold
```

---

## 🔒 Security Features

- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Password Hashing**: Passwords hashed with salt
- ✅ **Role-based Access**: Client/Freelancer roles
- ✅ **CORS Protection**: Configurable CORS headers
- ✅ **Input Validation**: All inputs validated
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **Fraud Detection**: Flag system for suspicious activity
- ✅ **Escrow Protection**: Funds held until milestone completion

---

## 📈 Performance

- ✅ **In-Memory Caching**: Repository-level caching
- ✅ **Database Indexes**: Strategic indexes on hot columns
- ✅ **Query Optimization**: Efficient SQL with joins
- ✅ **Pagination**: Large result set handling
- ✅ **Async Operations**: Non-blocking API calls

---

## 🧪 Testing

### Manual API Testing with cURL

```bash
# Register Freelancer
curl -X POST http://localhost:8080/api/auth/register-freelancer \
  -H "Content-Type: application/json" \
  -d '{
    "username":"john_dev",
    "email":"john@example.com",
    "password":"pass123",
    "skills":["JavaScript","React"]
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "password":"pass123"
  }'

# Create Project (with Bearer token)
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Build React App",
    "description":"Need a React developer",
    "budget":5000,
    "requiredSkills":["JavaScript","React"]
  }'

# Get All Projects
curl -X GET http://localhost:8080/api/projects
```

### Frontend Testing

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for React component testing and API integration examples.

---

## 📝 Design Patterns

1. **Inheritance**: `User → Client / Freelancer`
2. **Template Method**: `IRepository<T>` interface
3. **Strategy Pattern**: Matching strategies (SkillAnalyzer, ReliabilityCalculator)
4. **Dependency Injection**: Services injected with repositories
5. **Singleton**: Database connections
6. **Factory**: ID generation and object creation
7. **Observer**: Notification events
8. **DAO Pattern**: Repository abstraction

---

## ✅ Completion Status

### Fully Implemented & Documented
- ✅ **Core OOP Model Layer** (User, Client, Freelancer, Project, Bid, Payment, Notification)
- ✅ **Repository/DAO Layer** (Complete CRUD pattern with templates)
- ✅ **Service Layer** (Business logic for all features)
- ✅ **Controller Layer** (27+ REST API endpoints defined)
- ✅ **Main Application** (Crow framework with routing, dependency injection)
- ✅ **Database Schema** (12 tables, relationships, constraints, indexes)
- ✅ **API Documentation** (Complete REST endpoint specs with examples)
- ✅ **Integration Guide** (Frontend-backend connection tutorial)

### In Progress
- 🔄 Database driver implementation (SQLite C++ bindings)
- 🔄 Frontend component API integration
- 🔄 Real-time WebSocket implementation
- 🔄 Payment gateway integration

### Future Enhancements
- 📋 Advanced analytics and reporting
- 📋 Machine learning recommendations
- 📋 Mobile app (React Native)
- 📋 Two-factor authentication (2FA)
- 📋 Advanced fraud detection algorithms
- 📋 Stripe/PayPal integration
- 📋 Calendar and scheduling
- 📋 Video call integration

---

## 🔧 Configuration

### Backend Configuration (`backend/vcpkg.json`)

```json
{
  "dependencies": [
    "crow",
    "nlohmann-json",
    "jwt-cpp",
    "sqlite3"
  ]
}
```

### Frontend Configuration (`frontend/vite.config.js`)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

---

## 📞 API Examples

### Authentication Flow

```javascript
// 1. Register
POST /api/auth/register-freelancer
{
  "username": "john_dev",
  "email": "john@example.com",
  "password": "secure_pass",
  "skills": ["React", "JavaScript"]
}

// Response
{
  "success": true,
  "data": {
    "userId": "usr_1001",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}

// 2. Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "secure_pass"
}

// Response
{
  "success": true,
  "data": {
    "userId": "usr_1001",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userType": "freelancer"
  }
}
```

### Project Management

```javascript
// Create Project
POST /api/projects
{
  "title": "Mobile App Development",
  "description": "Build iOS and Android app",
  "budget": 10000,
  "deadline": "2024-12-31",
  "requiredSkills": ["Swift", "Kotlin"]
}

// Get Matching Freelancers
GET /api/matching/project/{projectId}

// Response
{
  "success": true,
  "data": {
    "matches": [
      {
        "freelancerId": "usr_2001",
        "name": "Jane Developer",
        "skillScore": 95,
        "reliabilityScore": 88,
        "activityScore": 85,
        "overallScore": 89.5,
        "isHighlighted": true
      }
    ]
  }
}
```

---

## 🎓 Learning Resources

### OOP Concepts Used
- [Inheritance](https://en.cppreference.com/w/cpp/language/inheritance)
- [Virtual Functions](https://en.cppreference.com/w/cpp/language/virtual)
- [Templates](https://en.cppreference.com/w/cpp/language/templates)
- [Const Correctness](https://isocpp.org/wiki/faq/const-correctness)

### Design Patterns
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)

### Technologies
- [Crow Framework](https://crowcpp.org/)
- [React Hooks](https://react.dev/reference/react/hooks)
- [SQLite](https://www.sqlite.org/docs.html)
- [JWT](https://jwt.io/)

---

## 💬 Support & Contributing

### Getting Help
1. Check the comprehensive documentation (DATABASE_SCHEMA.md, API_ENDPOINTS.md, INTEGRATION_GUIDE.md)
2. Review code comments and inline documentation
3. Examine working examples in integration guide
4. Check API endpoint specifications

### Contributing
- Follow the existing OOP architecture patterns
- Add documentation for new features
- Update API_ENDPOINTS.md for new endpoints
- Maintain 4-tier layer separation
- Include unit tests for service methods

---

## 📄 License

[Your License Here]

---

## 👥 Team & Authors

- **Backend Architecture**: OOP C++ design with Crow framework
- **Frontend**: React + Vite with Tailwind CSS
- **Database**: SQLite/MySQL relational design
- **AI Matching**: Custom scoring algorithms

---

## 🎉 Acknowledgments

Built with modern C++ best practices, OOP principles, and production-level software architecture.

**Happy Building! 🚀**

---

## 📋 Quick Reference

| What? | Where? |
|-------|--------|
| REST API specs | [API_ENDPOINTS.md](API_ENDPOINTS.md) |
| Database schema | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| Integration guide | [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) |
| Backend code | `backend/src/` |
| Frontend code | `frontend/src/` |
| Models | `backend/src/models/` |
| Services | `backend/src/services/` |
| Controllers | `backend/src/controllers/` |
| Repositories | `backend/src/repositories/` |

---

**Last Updated**: 2024
**Version**: 1.0.0

### 1. Database (MongoDB Atlas)
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Get your connection string (`mongodb+srv://...`).
3. Update `backend/src/config/Database.hpp` with your URI.

### 2. Backend Build (vcpkg + CMake)
The backend relies on `vcpkg` for seamless C++ dependency management.

**Prerequisites:**
- CMake (v3.15+)
- Visual Studio build tools (Windows) or GCC/Clang (Linux/Mac)
- [vcpkg](https://github.com/microsoft/vcpkg) installed and bootstrapped.

**Steps:**
1. Navigate to the backend directory:
   ```bash
   cd freelance_platform/backend
   ```
2. Configure the project with CMake, linking the vcpkg toolchain file:
   ```bash
   mkdir build && cd build
   cmake -DCMAKE_TOOLCHAIN_FILE=[path-to-vcpkg]/scripts/buildsystems/vcpkg.cmake ..
   ```
   *Note: This process will automatically download and build `crow`, `nlohmann-json`, `jwt-cpp`, and `mongo-cxx-driver`. The MongoDB driver compilation may take up to 30 minutes depending on your system.*
3. Build the executable:
   ```bash
   cmake --build . --config Release
   ```
4. Run the server:
   ```bash
   ./FreelancePlatform
   ```
   *The server will start on `http://localhost:8080`.*

### 3. Frontend Run (React + Vite)
**Prerequisites:** Node.js (v18+)

1. Navigate to the frontend directory:
   ```bash
   cd freelance_platform/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the browser link provided (usually `http://localhost:5173`).

---

## Testing the Application
- Open the frontend.
- **Register as Freelancer**: Add your skills.
- **Register as Client**: Post a project with a budget.
- **Freelancer actions**: Browse jobs, attempt to bid over the budget (watch it get auto-rejected).
- **Client actions**: View recommendations sorted by the OOP Intelligence Engine. Review Trust metrics.
>>>>>>> 54b464e (CPP-ACSES-)
