# 🏗️ IMPLEMENTATION ROADMAP - PHASE BY PHASE

This document outlines the **exact order** to build the entire system, with file-by-file breakdown.

---

## PHASE 1: DATABASE & INFRASTRUCTURE (Week 1)

### Step 1.1: Prisma Schema
**File:** `prisma/schema.prisma`

Complete schema with all models:
- `User` (admin, candidate)
- `Exam` (job_description, problems, settings)
- `Candidate` (email, outcome, vm_instance_id)
- `Problem` (title, difficulty, solution, testcases)
- `ExamLog` (all events: code_edit, focus_lost, gaze_away)
- `ExamResult` (scores, reports, AI penalty)
- `VMSchedule` (vm_instance_id, status)
- `NotificationLog` (email tracking)

```powershell
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### Step 1.2: PostgreSQL Migration Scripts
**File:** `prisma/migrations/*/migration.sql`

- `CREATE TABLE users`
- `CREATE TABLE exams`
- `CREATE TABLE exam_logs` with indexes on exam_id, candidate_id, event_type
- `CREATE TABLE exam_results` with percentile calculation trigger
- `CREATE TABLE vm_schedules`

### Step 1.3: Redis Queue Setup
**File:** `apps/api/src/queue/bull-config.ts`

Create Bull queue connections for:
- `examAnalysis` (n8n webhook trigger)
- `vmProvisioning` (Docker container spin-up)
- `emailNotification` (SendGrid dispatch)
- `logIngestion` (stream ExamLog events)

---

## PHASE 2: ML SERVER (Week 1-2)

### Step 2.1: FastAPI Structure
**File:** `services/ml-server/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

app = FastAPI(title="Assessment ML Server", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 2.2: Load Problems Dataset
**File:** `services/ml-server/loaders.py`

```python
import json
from pathlib import Path

def load_problems_dataset():
    dataset_path = Path("/app/data/problems_dataset.json")
    with open(dataset_path) as f:
        return json.load(f)

PROBLEMS = load_problems_dataset()
PROBLEM_EMBEDDINGS = precompute_embeddings(PROBLEMS)
```

### Step 2.3: Problem Suggestion Endpoint
**File:** `services/ml-server/routers/suggest.py`

Route: `POST /api/v1/problems/suggest`

```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')

@app.post("/api/v1/problems/suggest")
async def suggest_problems(job_description: str, seniority: str = "mid"):
    # Embed JD
    jd_embedding = model.encode(job_description)
    
    # Cosine similarity with all problems
    similarities = cosine_similarity([jd_embedding], PROBLEM_EMBEDDINGS)[0]
    
    # Get top 50, filter by seniority, rank by difficulty
    # Return top 10-15 with relevance_score, suggested_time_limit, reason
```

### Step 2.4: Time Limit Predictor
**File:** `services/ml-server/routers/timelimit.py`

Route: `POST /api/v1/problems/predict-time`

```python
import pickle
from sklearn.ensemble import GradientBoostingRegressor

with open('/app/models/timelimit_model.pkl', 'rb') as f:
    TIME_MODEL = pickle.load(f)

@app.post("/api/v1/problems/predict-time")
async def predict_time_limit(problem_id: str, difficulty: str):
    # Extract features from problem
    # features = [avg_lines_of_code, edge_case_count, difficulty_score]
    # predicted_minutes = TIME_MODEL.predict([features])[0]
    # Return { suggested_minutes, p25, p75 }
```

### Step 2.5: Difficulty Calibration
**File:** `services/ml-server/routers/difficulty.py`

Route: `POST /api/v1/difficulty/calibrate`

```python
@app.post("/api/v1/difficulty/calibrate")
async def calibrate_difficulty(candidate_id: str, problem_topic: str):
    # Fetch candidate's past exam results
    # Calculate percentile score for each topic
    # Recommend: if candidate scored 85th percentile on arrays → suggest harder arrays
    # Return { adjusted_difficulty, growth_area, recommended_topics }
```

### Step 2.6: Health & Startup
**File:** `services/ml-server/startup.py`

```python
@app.on_event("startup")
async def startup():
    logger.info("Loading ML models...")
    # Load sentence-transformers model
    # Load time prediction model (.pkl)
    # Pre-compute problem embeddings
    logger.info("✅ ML Server ready")

@app.get("/health")
async def health():
    return { "status": "healthy", "models_loaded": True }
```

### Step 2.7: Dockerfile
**File:** `services/ml-server/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

---

## PHASE 3: BACKEND API (Week 2)

### Step 3.1: Express Setup
**File:** `apps/api/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(express.json());

app.listen(3000, () => console.log("API running on port 3000"));
```

### Step 3.2: Exam Routes
**File:** `apps/api/src/routes/exam.ts`

```typescript
// POST /api/v1/exams
// - Create exam with job description
// - Call ML server /suggest
// - Return suggested problems

// GET /api/v1/exams/:examId
// - Fetch exam details, problems, whitelist config

// PATCH /api/v1/exams/:examId
// - Update exam (add/remove problems, adjust time limits)

// POST /api/v1/exams/:examId/submit
// - Candidate submits exam
// - Trigger n8n webhook for analysis
```

### Step 3.3: Activity Logger Routes
**File:** `apps/api/src/routes/logs.ts`

```typescript
// POST /api/v1/logs
// - Receive activity log from Electron/candidate VM
// - Validate: examId, candidateId, eventType, payload, timestamp
// - Save to PostgreSQL exam_logs table
// - Stream to Redis channel logs:{examId} for real-time proctoring
```

### Step 3.4: Results & Scoring Routes
**File:** `apps/api/src/routes/results.ts`

```typescript
// POST /api/v1/exam-analysis-complete (from n8n webhook)
// - Receive: examId, aiPenaltyLevel, proctoringRiskScore, codeQualityReport
// - Calculate final score = (codeScore * 0.30) + (codeQuality * 0.20) ...
// - Compute percentile
// - Store in exam_results table

// GET /api/v1/results/:examId/:candidateId
// - Return: raw_score, final_score, percentile, reports, disclaimer, penalty
```

### Step 3.5: Notification Routes
**File:** `apps/api/src/routes/notifications.ts`

```typescript
// POST /api/v1/results/notify
// - Receive: candidateId, examId, outcome ("selected"|"rejected"|"on_hold")
// - Queue email job in Bull → mailer service
// - Update candidate.outcome in DB
// - Return: { success, emailQueued }
```

### Step 3.6: VM Scheduler Routes
**File:** `apps/api/src/routes/vm.ts`

```typescript
// POST /api/v1/vm/schedule
// - Receive: examId, candidateIds, startTime, vmTier
// - Create Bull job: { type: "PROVISION", triggerAt: startTime - 10min }
// - Return: { scheduleId, provisioning: true, estimatedReadyTime }

// GET /api/v1/vm/:examId/status
// - Monitor live grid of VMs
// - Return: [{ candidateId, vmStatus, proctoringRiskScore, codeFile }]
```

### Step 3.7: Middleware & Error Handling
**File:** `apps/api/src/middleware/auth.ts`

```typescript
// JWT validation middleware
// Extract token from Authorization header
// Verify user (admin or candidate)
// Attach user context to request

// Error handling middleware
// Catch all errors, log to Winston logger
// Return appropriate HTTP status codes
```

---

## PHASE 4: ADMIN DASHBOARD (Week 2-3)

### Step 4.1: Next.js Project Setup
**File:** `apps/web/package.json`

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "axios": "^1.5.0"
  }
}
```

### Step 4.2: Admin Create Exam Flow
**File:** `apps/web/app/admin/create-exam/page.tsx`

```tsx
"use client"

import { useState } from 'react'
import { postToML } from '@/lib/api'

export default function CreateExam() {
  const [jd, setJd] = useState("")
  const [suggestions, setSuggestions] = useState([])
  
  const onPasteJD = async () => {
    // Call ML server /suggest with job_description
    const data = await postToML('/suggest', { job_description: jd })
    setSuggestions(data.suggested_problems)
  }
  
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <textarea value={jd} onChange={e => setJd(e.target.value)} 
                  placeholder="Paste job description here..." />
        <button onClick={onPasteJD}>Get Suggestions</button>
      </div>
      
      <div className="flex-1">
        {suggestions.map(p => (
          <ProblemCard key={p.problem_id} problem={p} onSelect={...} />
        ))}
      </div>
    </div>
  )
}
```

### Step 4.3: VM Scheduling UI
**File:** `apps/web/app/admin/schedule-vm/page.tsx`

```tsx
// DatePicker for exam date/time
// Multi-select for candidates
// VM Tier selector (Tier1, Tier2, Tier3)
// Region selector
// Submit → POST /api/v1/vm/schedule

// Show: "VMs will be provisioned at T-10min"
// Auto-update status as provisioning happens
```

### Step 4.4: Live Exam Monitor
**File:** `apps/web/app/admin/monitor/page.tsx`

```tsx
// Real-time grid of candidates
// Each card shows:
// - Candidate name
// - VM status (PROVISIONING, ACTIVE, EXAM_ENDED)
// - Live proctoring flags (gaze away, object detected)
// - Current file being edited
// - Time remaining
// - Force submit button

// WebSocket connection to backend
// Update every 2 seconds from Redis pub/sub
```

### Step 4.5: Results Review & Notify
**File:** `apps/web/app/admin/results/page.tsx`

```tsx
// List all completed exams
// Click on candidate → see:
// - Code quality report
// - Logic explanation scores
// - AI penalty level + disclaimer
// - Proctoring summary

// Buttons: "Mark Selected" / "Mark Rejected" / "Mark On Hold"
// Clicking → triggers notification workflow
// Show email status: Sent → Delivered → Opened
```

---

## PHASE 5: ELECTRON LOCKDOWN SHELL (Week 3)

### Step 5.1: Main Process
**File:** `electron/main.js`

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: __dirname + '/preload.js',
      sandbox: true,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });
  
  // KIOSK MODE - MAXIMUM LOCK DOWN
  mainWindow.setKiosk(true);
  mainWindow.webContents.session.setDevToolsWebSocketInactivityTimeout(0);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  
  // Block shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.keyCode.toLowerCase() === 'i') {
      event.preventDefault(); // Block Ctrl+Shift+I
    }
    if (input.keyCode === 116) {
      event.preventDefault(); // Block F5
    }
    if (input.keyCode === 123) {
      event.preventDefault(); // Block F12
    }
    // ... more blockers
  });
  
  mainWindow.loadURL('http://localhost:3001/exam/[examId]');
});
```

### Step 5.2: Preload Script
**File:** `electron/preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose only safe IPC methods
contextBridge.exposeInMainWorld('electronAPI', {
  logActivity: (event) => ipcRenderer.send('log-activity', event),
  captureFrame: () => ipcRenderer.invoke('capture-frame'),
  getExamConfig: () => ipcRenderer.invoke('get-exam-config')
});

// Block dangerous APIs
window.eval = undefined;
window.Function = undefined;
```

### Step 5.3: Network Whitelist
**File:** `electron/whitelist.config.json`

```json
{
  "allowed_domains": [
    "localhost:3001",
    "google.com",
    "w3schools.com",
    "stackoverflow.com",
    "developer.mozilla.org",
    "chat.openai.com",
    "claude.ai"
  ],
  "blocked_apps": ["cmd.exe", "powershell.exe", "devtools"],
  "block_right_click": true,
  "block_clipboard": true,
  "gaze_away_threshold_seconds": 3,
  "object_detection_confidence": 0.55
}
```

---

## PHASE 6: PROCTORING SYSTEM (Week 3-4)

### Step 6.1: Camera & MediaPipe Setup
**File:** `apps/web/components/Proctor/FaceMeshTracker.tsx`

```typescript
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export function FaceMeshTracker({ onGazeAway }) {
  const videoRef = useRef(null);
  const faceMesh = new FaceMesh({...});
  
  const onResults = (results) => {
    if (results.multiFaceLandmarks) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Extract iris position (landmarks 468-472)
      const irisY = landmarks[469].y;
      
      // Check if gaze is outside ±25° horizontal, ±20° vertical
      if (irisY > 0.35) {  // Gaze looking down/away
        onGazeAway({ duration: 3000 });
      }
    }
  };
  
  faceMesh.onResults(onResults);
  new Camera(videoRef.current, { onFrame: async () => await faceMesh.send({image: ...}) });
}
```

### Step 6.2: Object Detection
**File:** `apps/web/components/Proctor/ObjectDetector.tsx`

```typescript
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export function ObjectDetector({ onObjectDetected }) {
  const model = await cocoSsd.load();
  
  setInterval(async () => {
    const predictions = await model.detect(videoElement);
    
    const dangerousObjects = predictions.filter(p => 
      ['cell phone', 'person', 'earphones', 'headphones', 'book'].includes(p.class) &&
      p.score > 0.55  // Lower threshold to catch small items
    );
    
    if (dangerousObjects.length > 0) {
      onObjectDetected(dangerousObjects);
    }
  }, 3000);
}
```

### Step 6.3: Calibration at Exam Start
**File:** `apps/web/app/exam/calibration/page.tsx`

```tsx
// Show 5 dots on screen (corners + center)
// User looks at each for 2 seconds
// System stores calibration data for this user's camera
// Then starts actual gaze tracking with calibration applied
```

---

## PHASE 7: N8N WORKFLOWS (Week 4)

### Step 7.1: Exam Analysis Workflow
**File:** `n8n-workflows/exam-analysis.json`

```json
{
  "nodes": [
    {
      "name": "Receive Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "exam-complete",
        "method": "POST"
      }
    },
    {
      "name": "Fetch Logs from DB",
      "type": "n8n-nodes-base.postgres",
      "position": [450, 300],
      "parameters": {
        "query": "SELECT * FROM exam_logs WHERE exam_id = {{$node['Receive Webhook'].json.examId}}"
      }
    },
    {
      "name": "Analyze AI Usage",
      "type": "n8n-nodes-base.function",
      "position": [650, 300],
      "parameters": {
        "code": "// Count AI_TOOL_OPEN events\nconst aiSessions = data.filter(l => l.event_type === 'AI_TOOL_OPEN');\nreturn { aiUsageCount: aiSessions.length, aiPenaltyLevel: ... };"
      }
    },
    {
      "name": "Code Quality API",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 300],
      "parameters": {
        "url": "http://api:3000/api/v1/score/analyze",
        "method": "POST",
        "body": "{ code: ..., examId: ... }"
      }
    },
    {
      "name": "Store Results",
      "type": "n8n-nodes-base.postgres",
      "position": [1050, 300],
      "parameters": {
        "query": "UPDATE exam_results SET ai_penalty = ... WHERE exam_id = ..."
      }
    }
  ]
}
```

### Step 7.2: Notification Workflow
**File:** `n8n-workflows/notification-mailer.json`

```json
{
  "nodes": [
    {
      "name": "Receive Notify Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "notify",
        "method": "POST"
      }
    },
    {
      "name": "Fetch Candidate Data",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT name, email FROM candidates WHERE id = {{$node['Receive'].json.candidateId}}"
      }
    },
    {
      "name": "Branch on Outcome",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "conditions": [
          { "condition": "={{$node['Receive'].json.outcome}} === 'selected'" },
          { "condition": "={{$node['Receive'].json.outcome}} === 'rejected'" }
        ]
      }
    },
    {
      "name": "Send Selected Email",
      "type": "n8n-nodes-base.sendGrid",
      "position": [600, 200],
      "parameters": {
        "to": "{{$node['Fetch'].json.email}}",
        "subject": "🎉 Congratulations [Name] — You've been selected!",
        "html": "..." // HTML template
      }
    },
    {
      "name": "Send Rejected Email",
      "type": "n8n-nodes-base.sendGrid",
      "position": [600, 400],
      "parameters": {
        "to": "{{$node['Fetch'].json.email}}",
        "subject": "Your assessment results",
        "html": "..."
      }
    }
  ]
}
```

---

## PHASE 8: VM SCHEDULER & MAILER (Week 4)

### Step 8.1: VM Provisioning Worker
**File:** `services/vm-scheduler/workers/provision.js`

```javascript
import Bull from 'bull';
import Docker from 'dockerode';

const provisionQueue = new Bull('provision', process.env.REDIS_URL);
const docker = new Docker();

provisionQueue.process(async (job) => {
  const { examId, candidateId, vmTier } = job.data;
  
  // 1. Create Docker container from base image
  const container = await docker.createContainer({
    Image: 'assessment-exam-env:latest',
    Memory: vmTier === 'Tier1' ? 4 * 1024 * 1024 * 1024 : 8 * 1024 * 1024 * 1024,
    HostConfig: { NetworkMode: 'bridge' },
    Env: [
      `EXAM_ID=${examId}`,
      `CANDIDATE_ID=${candidateId}`,
      `EXAM_TOKEN=${generateToken()}`
    ]
  });
  
  // 2. Start container
  await container.start();
  
  // 3. Store vm_instance_id in database
  await prisma.vmSchedule.update({
    where: { examId_candidateId: { examId, candidateId } },
    data: { vm_instance_id: container.id, status: 'PROVISIONED' }
  });
  
  // 4. Health check
  let healthy = false;
  for (let i = 0; i < 10; i++) {
    try {
      await axios.get(`http://${container.id}:3001/health`);
      healthy = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  if (!healthy) throw new Error("VM failed to boot");
});
```

### Step 8.2: VM Termination Worker
**File:** `services/vm-scheduler/workers/terminate.js`

```javascript
const terminateQueue = new Bull('terminate', process.env.REDIS_URL);

terminateQueue.process(async (job) => {
  const { examId, candidateId } = job.data;
  
  // 1. Get VM ID from database
  const vmSchedule = await prisma.vmSchedule.findUnique({
    where: { examId_candidateId: { examId, candidateId } }
  });
  
  // 2. Ship final code snapshot to MinIO
  const codeSnapshot = await fetchCodeFromVM(vmSchedule.vm_instance_id);
  await minioClient.fPutObject('exam-snapshots', 
    `${examId}/${candidateId}/final.zip`, codeSnapshot);
  
  // 3. Ship logs to PostgreSQL (if not already done)
  // ... (logs should be streamed continuously)
  
  // 4. Stop container
  const container = docker.getContainer(vmSchedule.vm_instance_id);
  await container.stop({ t: 10 });
  
  // 5. Remove container
  await container.remove({ force: true });
  
  // 6. Update status
  await prisma.vmSchedule.update({
    where: { examId_candidateId: { examId, candidateId } },
    data: { status: 'TERMINATED', terminated_at: new Date() }
  });
});
```

### Step 8.3: Mailer Service
**File:** `services/mailer/index.js`

```javascript
import express from 'express';
import Bull from 'bull';
import sgMail from '@sendgrid/mail';

const app = express();
const emailQueue = new Bull('email', process.env.REDIS_URL);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// POST /send queues an email job
app.post('/send', (req, res) => {
  const { to, subject, html } = req.body;
  emailQueue.add({ to, subject, html }, { retries: 3 });
  res.json({ queued: true });
});

// Process email jobs
emailQueue.process(async (job) => {
  const { to, subject, html } = job.data;
  
  try {
    await sgMail.send({ to, from: 'noreply@example.com', subject, html });
    return { success: true, messageId: '...' };
  } catch (error) {
    if (job.attemptsMade < 3) {
      throw error; // Retry
    }
    // Log permanent failure
    await logEmailFailure(to, error);
  }
});

// SendGrid webhook for delivery tracking
app.post('/webhook', (req, res) => {
  const events = req.body;
  events.forEach(async (event) => {
    if (event.event === 'delivered') {
      await prisma.notificationLog.update({
        where: { candidateId: ... },
        data: { email_status: 'DELIVERED', delivered_at: new Date() }
      });
    }
  });
  res.status(200).send('OK');
});

app.listen(3002);
```

---

## PHASE 9: TESTING & DEPLOYMENT (Week 5)

### Step 9.1: Integration Tests
**File:** `apps/api/tests/exam.test.ts`

```typescript
import { test, expect } from '@jest/globals';

test('Create exam with JD → ML suggestions returned', async () => {
  const res = await axios.post('http://localhost:3000/api/v1/exams', {
    title: 'Backend Engineer',
    job_description: '5+ years Python...'
  });
  
  expect(res.status).toBe(201);
  expect(res.data.suggested_problems).toHaveLength(15);
  expect(res.data.suggested_problems[0]).toHaveProperty('relevance_score');
});

test('Schedule VMs → provision at T-10min', async () => {
  const examTime = new Date(Date.now() + 10 * 60 * 1000); // T+10min
  
  await axios.post('http://localhost:3000/api/v1/vm/schedule', {
    examId: 'exam-123',
    candidateIds: ['cand-1', 'cand-2'],
    startTime: examTime,
    vmTier: 'Tier1'
  });
  
  // Check that job was queued
  const jobs = await provisionQueue.getJobs();
  expect(jobs.length).toBeGreaterThan(0);
});

test('Log activity → streamed to Redis', async () => {
  const redis = new Redis();
  
  const subscriber = redis.subscribe(`logs:exam-123`);
  const data = await new Promise(resolve => {
    subscriber.on('message', resolve);
    
    axios.post('http://localhost:3000/api/v1/logs', {
      examId: 'exam-123',
      candidateId: 'cand-1',
      eventType: 'CODE_EDIT',
      payload: { file: 'main.py', lines: 5 }
    });
  });
  
  expect(data.eventType).toBe('CODE_EDIT');
});
```

### Step 9.2: Load Testing
**File:** `tests/load-test.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 100 },
    { duration: '20s', target: 0 },
  ],
};

export default function() {
  let res = http.post('http://localhost:3000/api/v1/logs', {
    examId: 'exam-123',
    eventType: 'CODE_EDIT'
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## BUILD ORDER SUMMARY

```
WEEK 1:
├─ Database Schema (Prisma)
├─ Redis Queue Setup
└─ ML Server (FastAPI routes)

WEEK 2:
├─ Backend API (Express)
├─ Admin Dashboard (Next.js) - Create exam flow
└─ Activity Logger integration

WEEK 3:
├─ Electron Lockdown Shell
├─ Proctoring System (MediaPipe + COCO-SSD)
└─ Results & Scoring routes

WEEK 4:
├─ N8N Workflows (analysis + notification)
├─ VM Scheduler (provision + terminate)
└─ Mailer Service

WEEK 5:
├─ Testing (integration + load)
├─ Bug fixes & optimization
└─ Deployment to staging/production
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Prisma schema created & migrations run
- [ ] ML server running with suggestions endpoint
- [ ] Express API with all routes
- [ ] Admin dashboard fully functional
- [ ] Electron shell locks down browser
- [ ] MediaPipe + COCO-SSD tracking working
- [ ] N8N workflows imported & tested
- [ ] VM provisioning queue operational
- [ ] Mailer service sending emails
- [ ] All tests passing
- [ ] Performance optimized (<200ms API latency)
- [ ] Deployed to production

---

**Total Implementation Time:** 5 weeks (with full team)  
**Total Lines of Code:** ~15,000  
**Services:** 12 microservices  
**Database Tables:** 8  
**API Endpoints:** 25+  
**Status:** Ready to build

