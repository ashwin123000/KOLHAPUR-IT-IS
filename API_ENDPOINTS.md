# Freelancer Marketplace - REST API Documentation

**Base URL**: `http://localhost:8080/api`

## Authentication Endpoints

### 1. Register Freelancer
- **POST** `/auth/register-freelancer`
- **Request Body**:
```json
{
  "username": "john_dev",
  "email": "john@example.com",
  "password": "secure_password",
  "collegeName": "IIT Mumbai",
  "studyYear": 3,
  "skills": ["JavaScript", "React", "Node.js"]
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Freelancer registered successfully",
  "user": {
    "id": "freelancer_xxx",
    "username": "john_dev",
    "email": "john@example.com",
    "role": "FREELANCER",
    "skills": ["JavaScript", "React", "Node.js"],
    "createdAt": "2026-03-26 10:30:00"
  },
  "token": "jwt_token_here"
}
```

### 2. Register Client
- **POST** `/auth/register-client`
- **Request Body**:
```json
{
  "username": "acme_corp",
  "email": "hr@acme.com",
  "password": "secure_password",
  "companyName": "Acme Corp",
  "companyWebsite": "https://acme.com"
}
```
- **Response**: `201 Created` (Similar to freelancer)

### 3. Login
- **POST** `/auth/login`
- **Request Body**:
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "freelancer_xxx",
    "email": "john@example.com",
    "role": "FREELANCER",
    "reliabilityScore": 95.5
  }
}
```

---

## Project Management Endpoints

### 4. Create Project
- **POST** `/projects`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "title": "Mobile App Development",
  "description": "Build a React Native mobile application",
  "clientId": "client_123",
  "budget": 5000,
  "difficultyLevel": 3,
  "requiredSkills": ["React Native", "JavaScript", "Firebase"],
  "deadlineTimestamp": 1714041600
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Project created successfully",
  "project": {
    "id": "project_456",
    "title": "Mobile App Development",
    "status": "open",
    "budget": 5000,
    "bidCount": 0,
    "createdAt": "2026-03-26 10:35:00"
  }
}
```

### 5. Get All Open Projects
- **GET** `/projects`
- **Query Parameters**:
  - `status` (optional): open, in_progress, completed
  - `minBudget` (optional): Minimum budget filter
  - `maxBudget` (optional): Maximum budget filter
  - `skill` (optional): Filter by required skill
  - `page` (optional): Pagination (default: 1)
  - `limit` (optional): Items per page (default: 20)

- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "project_456",
      "title": "Mobile App Development",
      "description": "Build a React Native mobile application",
      "budget": 5000,
      "status": "open",
      "requiredSkills": ["React Native", "JavaScript"],
      "difficultyLevel": 3,
      "bidCount": 5,
      "createdAt": "2026-03-26 10:35:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### 6. Get Project Details
- **GET** `/projects/{projectId}`
- **Response**: `200 OK`
```json
{
  "success": true,
  "project": {
    "id": "project_456",
    "title": "Mobile App Development",
    "description": "Build a React Native mobile application",
    "clientId": "client_123",
    "budget": 5000,
    "status": "open",
    "requiredSkills": ["React Native", "JavaScript", "Firebase"],
    "difficultyLevel": 3,
    "bidCount": 5,
    "deadlineTimestamp": 1714041600,
    "createdAt": "2026-03-26 10:35:00",
    "updatedAt": "2026-03-26 11:45:00"
  }
}
```

### 7. Update Project
- **PUT** `/projects/{projectId}`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**: Any subset of project fields
```json
{
  "title": "Updated Title",
  "budget": 6000
}
```
- **Response**: `200 OK`

### 8. Start Project (Assign Freelancer)
- **POST** `/projects/{projectId}/start`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "freelancerId": "freelancer_xxx",
  "bidId": "bid_789"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Project started successfully",
  "project": {
    "id": "project_456",
    "status": "in_progress",
    "awardedTo": "freelancer_xxx"
  }
}
```

### 9. Complete Project
- **POST** `/projects/{projectId}/complete`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK`

---

## Bid Management Endpoints

### 10. Submit Bid
- **POST** `/bids`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "projectId": "project_456",
  "freelancerId": "freelancer_xxx",
  "amount": 4800,
  "proposal": "I have 5+ years of React Native experience...",
  "proposedDuration": 21
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Bid submitted successfully",
  "bid": {
    "id": "bid_789",
    "projectId": "project_456",
    "freelancerId": "freelancer_xxx",
    "amount": 4800,
    "status": "pending",
    "createdAt": "2026-03-26 12:00:00"
  }
}
```

### 11. Get Project Bids
- **GET** `/projects/{projectId}/bids`
- **Response**: `200 OK`
```json
{
  "success": true,
  "bids": [
    {
      "id": "bid_789",
      "freelancerId": "freelancer_xxx",
      "freelancerName": "John Doe",
      "amount": 4800,
      "proposal": "I have experience...",
      "status": "pending",
      "skillScore": 92,
      "timelineScore": 88,
      "priceValueScore": 85,
      "overallScore": 88.3,
      "isHighlightedBudgetOption": false,
      "isHighlightedBestValue": true,
      "createdAt": "2026-03-26 12:00:00"
    }
  ]
}
```

### 12. Accept Bid
- **POST** `/bids/{bidId}/accept`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Bid accepted successfully",
  "bidId": "bid_789",
  "projectId": "project_456"
}
```

### 13. Reject Bid
- **POST** `/bids/{bidId}/reject`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body** (optional):
```json
{
  "reason": "Found a better match"
}
```
- **Response**: `200 OK`

### 14. Get Bid Ranking
- **GET** `/projects/{projectId}/bids/ranking`
- **Response**: `200 OK` (Returns bids sorted by overall score)

---

## AI Matching Endpoints

### 15. Get Best Matches for Project
- **GET** `/matching/project/{projectId}`
- **Query Parameters**:
  - `limit` (optional): Number of results (default: 10)
  - `minReliability` (optional): Minimum reliability score

- **Response**: `200 OK`
```json
{
  "success": true,
  "projectId": "project_456",
  "matches": [
    {
      "freelancerId": "freelancer_xxx",
      "freelancerName": "John Doe",
      "skillScore": 92,
      "reliabilityScore": 88,
      "activityScore": 95,
      "overallScore": 91.3,
      "isEligible": true,
      "eligibilityReason": "Perfect match",
      "skills": ["React Native", "JavaScript", "Firebase"],
      "portfolio": ["https://portfolio.com/app1", "https://portfolio.com/app2"],
      "completedProjects": 12,
      "averageRating": 4.8
    }
  ]
}
```

### 16. Get Projects for Freelancer
- **GET** `/matching/freelancer/{freelancerId}`
- **Query Parameters**:
  - `limit` (optional): Number of results (default: 10)

- **Response**: `200 OK` (Returns recommended projects)

### 17. Get Skill Gap Analysis
- **GET** `/matching/skill-gap/{freelancerId}/{projectId}`
- **Response**: `200 OK`
```json
{
  "success": true,
  "matchedSkills": ["React Native", "JavaScript"],
  "missingSkills": ["Firebase"],
  "matchPercentage": 66.7,
  "skillScore": 66.7,
  "reliabilityScore": 88,
  "recommendation": "Good match overall. Could learn Firebase quickly."
}
```

---

## Payment & Escrow Endpoints

### 18. Initiate Payment
- **POST** `/payments`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "projectId": "project_456",
  "clientId": "client_123",
  "freelancerId": "freelancer_xxx",
  "amount": 2500,
  "milestoneId": "milestone_1"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Payment initiated",
  "payment": {
    "id": "payment_111",
    "amount": 2500,
    "status": "pending",
    "createdAt": "2026-03-26 14:00:00"
  }
}
```

### 19. Create Escrow Account
- **POST** `/escrow`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "projectId": "project_456",
  "clientId": "client_123",
  "freelancerId": "freelancer_xxx",
  "totalAmount": 5000
}
```
- **Response**: `201 Created`

### 20. Release Escrow Funds
- **POST** `/escrow/{escrowId}/release`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "amount": 2500,
  "milestoneId": "milestone_1"
}
```
- **Response**: `200 OK`

### 21. Get Payment History
- **GET** `/payments?userId={userId}`
- **Query Parameters**:
  - `userId`: User ID
  - `status` (optional): Filter by status
  - `startDate` (optional): ISO date
  - `endDate` (optional): ISO date

- **Response**: `200 OK`

---

## Notification & Chat Endpoints

### 22. Get User Notifications
- **GET** `/notifications?userId={userId}`
- **Query Parameters**:
  - `limit` (optional): Default 50
  - `offset` (optional): Pagination

- **Response**: `200 OK`
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_555",
      "title": "New Bid Received",
      "message": "John Doe submitted a bid for your project",
      "type": "bid",
      "relatedEntityId": "bid_789",
      "isRead": false,
      "createdAt": 1711440000,
      "actionUrl": "/projects/project_456/bids"
    }
  ]
}
```

### 23. Mark Notification as Read
- **PUT** `/notifications/{notificationId}/read`
- **Response**: `200 OK`

### 24. Send Message
- **POST** `/chat/messages`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
```json
{
  "chatRoomId": "chatroom_999",
  "content": "The design looks great!"
}
```
- **Response**: `201 Created`

### 25. Get Chat Messages
- **GET** `/chat/{chatRoomId}/messages`
- **Query Parameters**:
  - `limit` (optional): Default 100
  - `offset` (optional): Pagination

- **Response**: `200 OK`
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_001",
      "senderName": "John Doe",
      "content": "The design looks great!",
      "sentAt": 1711440000,
      "isRead": true
    }
  ]
}
```

---

## Analytics & Dashboard Endpoints

### 26. Get Dashboard Stats
- **GET** `/stats/dashboard/{userId}`
- **Response**: `200 OK`
```json
{
  "success": true,
  "stats": {
    "activeProjects": 3,
    "completedProjects": 12,
    "totalEarnings": 45000,
    "totalSpent": 89000,
    "averageRating": 4.8,
    "reliabilityScore": 92.5,
    "pendingPayments": 5000,
    "escrowBalance": 10000
  }
}
```

### 27. Get Freelancer Analytics
- **GET** `/analytics/freelancer/{freelancerId}`
- **Response**: `200 OK`
```json
{
  "success": true,
  "analytics": {
    "totalEarned": 45000,
    "projectsCompleted": 12,
    "averageProjectDuration": 21,
    "skillDemand": {"React": 15, "JavaScript": 18, "Node.js": 12},
    "earningsOverTime": [
      {"month": "Jan 2026", "amount": 3500},
      {"month": "Feb 2026", "amount": 4200}
    ]
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Rate Limiting

- Limit: 100 requests per minute per API key
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Authentication

All protected endpoints require:
```
Authorization: Bearer {jwt_token}
```

JWT tokens expire after 24 hours. Use `/auth/refresh` to get a new token.
