/* ============================================================
   AI JOB ANALYZER — FRONTEND INTELLIGENCE ENGINE
   ============================================================ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
const state = {
  currentTool: 'job-analyzer',
  currentView: 'home',   // 'home' | 'chat'
  chatHistories: {},     // { toolId: [{role,content,data}] }
  history: JSON.parse(localStorage.getItem('ajh') || '[]'),
  totalAnalyses: parseInt(localStorage.getItem('ajtotal') || '0'),
  scores: JSON.parse(localStorage.getItem('ajscores') || '[]'),
  isTyping: false,
};

// ─── TOOL CONFIG ─────────────────────────────────────────────
const TOOLS = {
  'job-analyzer': {
    name: 'AI Job Analyzer',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
    placeholder: 'Paste job description here...\n\nExample: "We are looking for a Senior React Developer..."',
    welcomeTitle: 'Ready to analyze your job post',
    welcomeDesc: 'Paste any job description and get instant AI analysis — requirements, red flags, salary estimate, and your match score.',
    chips: ['Paste sample job post →', 'Check salary range →', 'Find red flags →'],
    sample: `Senior React Developer — Remote
Budget: $4,000–6,000/month
Duration: 6 months, possible extension

We need an experienced React developer to join our SaaS startup. You'll be building core product features, working with our CTO, and shipping fast.

Requirements:
- 4+ years React experience
- TypeScript proficiency
- REST API / GraphQL
- Familiarity with AWS or Firebase
- Excellent communication (we are fully remote)

Nice to have: Next.js, testing (Jest/Cypress), CI/CD experience

Apply with a short proposal and your hourly rate.`,
  },
  'resume-improver': {
    name: 'Resume Improver',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    placeholder: 'Paste your resume here...\n\nInclude your experience, skills, and education sections.',
    welcomeTitle: 'Let\'s transform your resume',
    welcomeDesc: 'Paste your resume and get section-by-section feedback, ATS optimization tips, and impact-driven rewrites.',
    chips: ['Paste sample resume →', 'Check ATS score →', 'Improve summary →'],
    sample: `John Doe — React Developer
john@email.com | LinkedIn | GitHub

EXPERIENCE
Web Developer, ABC Corp (2021–2024)
- Made websites
- Fixed bugs
- Worked with team

SKILLS
React, JavaScript, CSS, HTML, Node.js

EDUCATION
B.Sc Computer Science, 2020`,
  },
  'proposal-scorer': {
    name: 'Proposal Scorer',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    placeholder: 'Paste your proposal here...\n\nInclude your pitch, relevant experience, and pricing.',
    welcomeTitle: 'Score your proposal instantly',
    welcomeDesc: 'Paste your freelance proposal and get a win-rate score, tone analysis, competitor comparison, and rewrite suggestions.',
    chips: ['Score my proposal →', 'Fix weak opener →', 'Improve close →'],
    sample: `Hi, I'm a React developer with experience. I can do this project. I have worked on similar things before and I know React well. I will complete this on time. My rate is $50/hr. Let me know if you want to work with me. Thanks.`,
  },
  'client-risk': {
    name: 'Client Risk Detector',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg,#ef4444,#dc2626)',
    placeholder: 'Paste client job post or message here...\n\nI\'ll detect payment risks, scope creep, and red flags.',
    welcomeTitle: 'Protect yourself from bad clients',
    welcomeDesc: 'Paste any client job post or message. I\'ll detect vague scope, payment risks, scope creep signs, and give you negotiation tips.',
    chips: ['Check this job post →', 'Analyze client message →', 'Red flag scan →'],
    sample: `Looking for a developer for a simple website. Should be done fast — maybe 2-3 days? I have a vision but no exact specs yet. Budget is flexible, we can discuss. I need login, e-commerce, admin dashboard, mobile app, and AI integration. Simple project. Start ASAP.`,
  },
  'skill-gap': {
    name: 'Skill Gap Analyzer',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    placeholder: 'Describe your current skills and target role...\n\nExample: "I know React and CSS. I want to land senior frontend jobs."',
    welcomeTitle: 'Discover your skill gaps',
    welcomeDesc: 'Tell me your current skills and target role. I\'ll map the gaps, prioritize what to learn, and give you a 90-day roadmap.',
    chips: ['Find my skill gaps →', 'Build learning roadmap →', 'Compare to market →'],
    sample: `I know React, CSS, and basic JavaScript. I've been freelancing for 2 years. I want to apply for senior frontend developer jobs that pay $80k+. What am I missing?`,
  },
};

// ─── AI RESPONSE ENGINE ──────────────────────────────────────
const AI_RESPONSES = {
  'job-analyzer': (input) => ({
    score: 74,
    risk: 'medium',
    match: 68,
    confidence: 4,
    analysis: `This job post is a solid mid-senior React role with remote work. The scope is reasonably well-defined with a 6-month engagement. Budget of $4,000–6,000/month (~$25–37/hr) is below market rate for the seniority level requested.`,
    issues: [
      { level: 'high', text: 'Budget ($4–6K/mo) is 20–30% below market rate for a "senior" role requiring 4+ years + TypeScript + AWS.' },
      { level: 'medium', text: '"Possible extension" is vague — no clear milestone or renewal criteria defined.' },
      { level: 'medium', text: 'No mention of timezone requirements for a fully remote team — potential async friction.' },
      { level: 'low', text: 'Testing and CI/CD listed as "nice to have" but are standard for senior engineers — assess expectations carefully.' },
    ],
    suggestions: [
      'Negotiate to $55–75/hr or $8,000+/mo given the senior scope',
      'Ask for a milestone-based contract to protect against scope changes',
      'Request clarity on team size, sprint cadence, and communication tools',
      'Highlight TypeScript, AWS, and Next.js in your proposal for maximum match',
    ],
    skills: [
      { name: 'TypeScript (Advanced)', importance: 'high' },
      { name: 'AWS / Firebase', importance: 'high' },
      { name: 'GraphQL', importance: 'medium' },
      { name: 'Jest / Cypress', importance: 'low' },
    ],
    tips: [
      'Use specific numbers in your proposal (e.g., "reduced load time by 40%")',
      'Mention your timezone alignment if in ±2hrs of US EST',
      'Ask about team size upfront to gauge collaboration complexity',
    ],
  }),
  'resume-improver': (input) => ({
    score: 38,
    risk: 'high',
    match: 25,
    confidence: 5,
    analysis: `Your resume has critical weaknesses that will cause it to be rejected by ATS systems before a human ever sees it. The experience section uses generic, action-poor language with zero quantifiable achievements. This resume would score very low in automated screening.`,
    issues: [
      { level: 'high', text: 'Zero metrics or impact numbers. "Made websites" and "Fixed bugs" are weak — replace with results.' },
      { level: 'high', text: 'ATS will likely reject this: no keywords matching target job descriptions detected.' },
      { level: 'medium', text: 'No professional summary section — recruiters spend 6 seconds; yours gives them nothing to grab.' },
      { level: 'medium', text: 'Skills section is generic. No mention of state management (Redux/Zustand), testing, or build tools.' },
      { level: 'low', text: 'Education section missing GPA, relevant coursework, or honors — missed opportunity.' },
    ],
    suggestions: [
      'Rewrite bullets using CAR format: Context → Action → Result',
      'Add a 2-line professional summary targeting your exact role',
      'Quantify achievements: "Built 12 responsive features increasing retention by 23%"',
      'Add TypeScript, Redux, REST APIs, Git, CI/CD to skills to pass ATS filters',
      'Use action verbs: Engineered, Architected, Optimized, Delivered, Spearheaded',
    ],
    skills: [
      { name: 'TypeScript', importance: 'high' },
      { name: 'Redux / Zustand', importance: 'high' },
      { name: 'Testing (Jest)', importance: 'medium' },
      { name: 'CI/CD basics', importance: 'medium' },
      { name: 'Docker fundamentals', importance: 'low' },
    ],
    tips: [
      'Tailor your resume for each application — ATS filters are precise',
      'Keep it 1 page unless you have 7+ years experience',
      'Put most impactful achievement in your FIRST bullet under each role',
    ],
  }),
  'proposal-scorer': (input) => ({
    score: 29,
    risk: 'high',
    match: 20,
    confidence: 5,
    analysis: `This proposal is critically weak and will be ignored in most competitive markets. It lacks personalization, quantified value, and a compelling hook. The opening line fails to differentiate you from 50+ other applicants saying the same thing.`,
    issues: [
      { level: 'high', text: 'Generic opener "Hi, I\'m a React developer with experience" — client sees 50+ exactly like this.' },
      { level: 'high', text: 'No specific reference to the client\'s project, problem, or goals — shows zero research.' },
      { level: 'high', text: 'No portfolio, proof points, or relevant past work mentioned — no trust signals.' },
      { level: 'medium', text: 'Vague timeline commitment — "complete on time" without specifics is meaningless.' },
      { level: 'low', text: 'Closing is weak — "Let me know" puts all the burden on the client.' },
    ],
    suggestions: [
      'Open with their specific problem: "I noticed your SaaS needs a fast checkout flow — I\'ve built 3 similar systems."',
      'Lead with a quick specific insight about their project to show you read carefully',
      'Add 1 relevant portfolio link with a 1-line description of what you built',
      'Include a concrete timeline: "I can deliver the MVP in 3 weeks with daily updates"',
      'Close with a CTA: "Would a 15-min call this week work to align on scope?"',
    ],
    skills: [
      { name: 'Copywriting / Hook writing', importance: 'high' },
      { name: 'Client discovery skills', importance: 'high' },
      { name: 'Portfolio curation', importance: 'medium' },
    ],
    tips: [
      'Best proposals are 150–250 words — clients skim, not read',
      'Reference the client\'s name or company if visible',
      'The first 2 sentences determine if they read the rest',
    ],
  }),
  'client-risk': (input) => ({
    score: 22,
    risk: 'high',
    match: 0,
    confidence: 5,
    analysis: `⚠️ HIGH RISK CLIENT DETECTED. This job post contains 7 major red flags consistent with scope creep, underpayment, and unclear expectations. I strongly recommend not bidding without a detailed discovery call and written SOW.`,
    issues: [
      { level: 'high', text: '"No exact specs yet" — Undefined scope means unlimited revisions and scope creep.' },
      { level: 'high', text: '"Simple website" but requires login, e-commerce, admin dashboard, mobile app, AND AI — this is a $30,000+ project.' },
      { level: 'high', text: '"Budget is flexible" with no anchor — classic tactic to lowball after you\'re invested.' },
      { level: 'high', text: '"Done in 2-3 days" expectation for a multi-feature product is unrealistic and disrespectful.' },
      { level: 'medium', text: '"Start ASAP" urgency suggests a disorganized client who makes emotional decisions.' },
      { level: 'medium', text: 'No mention of design assets, brand guidelines, or existing systems — massive unknowns.' },
    ],
    suggestions: [
      'DO NOT bid without a 30-min paid discovery call to define scope',
      'Provide a detailed SOW with explicit "not included" section',
      'Quote 3x your normal rate to compensate for uncertainty risk',
      'Milestone-based payments only — 50% upfront minimum',
      'If they push back on any boundary, walk away — this client will cost you money',
    ],
    skills: [
      { name: 'Contract writing', importance: 'high' },
      { name: 'Scope negotiation', importance: 'high' },
      { name: 'Red flag patterns', importance: 'medium' },
    ],
    tips: [
      'Your gut feeling is data — trust it with difficult clients',
      'Bad clients cost more in stress than they pay in money',
      'Always get payment terms in writing before starting any work',
    ],
  }),
  'skill-gap': (input) => ({
    score: 55,
    risk: 'medium',
    match: 45,
    confidence: 4,
    analysis: `You have a solid foundation for frontend work. To reach senior-level ($80K+) roles, you need to bridge specific technical and professional gaps. The market expects TypeScript, testing, performance optimization, and system design knowledge at this level.`,
    issues: [
      { level: 'high', text: 'TypeScript is required in 78% of senior frontend job postings — not knowing it filters you out automatically.' },
      { level: 'high', text: 'No testing experience (Jest/RTL/Cypress) — seniors are expected to own test coverage.' },
      { level: 'medium', text: 'Basic JavaScript listed — seniors need deep JS: closures, event loop, memory, async patterns.' },
      { level: 'medium', text: 'No mention of performance optimization, Core Web Vitals, or bundle analysis.' },
      { level: 'low', text: 'System design knowledge gaps — senior roles often involve architecture decisions.' },
    ],
    suggestions: [
      '📚 Month 1: TypeScript Deep Dive (Matt Pocock\'s Total TypeScript — free)',
      '📚 Month 2: Testing with Jest + React Testing Library (8-hr project challenge)',
      '📚 Month 3: Advanced JavaScript — Kyle Simpson\'s "You Don\'t Know JS"',
      '🚀 Build 1 TypeScript + testing showcase project and deploy it',
      '💼 Target "mid+ to senior" roles first, negotiate up once inside',
    ],
    skills: [
      { name: 'TypeScript (Advanced)', importance: 'high' },
      { name: 'Jest / React Testing Library', importance: 'high' },
      { name: 'Advanced JavaScript', importance: 'high' },
      { name: 'Web Performance (CWV)', importance: 'medium' },
      { name: 'System Design basics', importance: 'medium' },
      { name: 'GraphQL / tRPC', importance: 'low' },
    ],
    tips: [
      '90-day plan: TypeScript → Testing → Advanced JS → Apply',
      'Contribute to 1 open source project to prove skills publicly',
      'Update LinkedIn with keywords: TypeScript, Testing, Performance Optimization',
    ],
  }),
};

// ─── SAMPLE WELCOME CHIP PROMPTS ─────────────────────────────
const WELCOME_CHIP_PROMPTS = {
  'job-analyzer': ['Paste a sample job →', 'Analyze my target role →', 'Check market rate →'],
  'resume-improver': ['Paste sample resume →', 'Check ATS score →', 'Improve my summary →'],
  'proposal-scorer': ['Score sample proposal →', 'Fix my weak opener →', 'Improve close →'],
  'client-risk': ['Check sample job post →', 'Analyze this message →', 'Red flag scan →'],
  'skill-gap': ['Analyze my skill gaps →', 'Build my roadmap →', 'Compare to market →'],
};

// ─── DOM REFS ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const homeView = $('homeView');
const chatView = $('chatView');
const chatBody = $('chatBody');
const messagesList = $('messagesList');
const chatInput = $('chatInput');
const sendBtn = $('sendBtn');
const chatWelcome = $('chatWelcome');
const historyList = $('historyList');
const toast = $('toast');

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  updateStats();
  renderHistory();
  setupEventListeners();
  loadTheme();
}

// ─── EVENT LISTENERS ──────────────────────────────────────────
function setupEventListeners() {
  // Theme toggle
  $('themeToggle').addEventListener('click', toggleTheme);

  // Tool nav items
  document.querySelectorAll('.tool-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTool(btn.dataset.tool));
  });

  // Tool cards & buttons
  document.querySelectorAll('.tool-card, .tool-card-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      const tool = el.dataset.tool || el.closest('[data-tool]')?.dataset.tool;
      if (tool) { e.stopPropagation(); switchTool(tool); showChatView(); }
    });
  });

  // Quick chips (home)
  document.querySelectorAll('#quickChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      switchTool(chip.dataset.tool);
      showChatView();
      setTimeout(() => {
        chatInput.value = chip.dataset.prompt || '';
        autoResizeInput();
      }, 400);
    });
  });

  // Back button
  $('backBtn').addEventListener('click', showHomeView);

  // Send
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  chatInput.addEventListener('input', autoResizeInput);

  // Insert sample
  $('insertSampleBtn').addEventListener('click', () => {
    const tool = TOOLS[state.currentTool];
    chatInput.value = tool.sample || '';
    autoResizeInput();
    chatInput.focus();
  });

  // Chat tabs
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Clear history
  $('clearHistory').addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('ajh');
    renderHistory();
    showToast('History cleared');
  });

  // Welcome chips
  document.querySelectorAll('.welcome-chip').forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const tool = TOOLS[state.currentTool];
      chatInput.value = tool.sample || '';
      autoResizeInput();
      chatInput.focus();
    });
  });
}

// ─── THEME ────────────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('ajtheme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ajtheme', next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  $('themeIconSun').classList.toggle('hidden', theme === 'dark');
  $('themeIconMoon').classList.toggle('hidden', theme === 'light');
}

// ─── VIEW SWITCHING ───────────────────────────────────────────
function showChatView() {
  state.currentView = 'chat';
  homeView.classList.remove('view-active');
  chatView.classList.add('view-active');
  updateChatHeader();
  renderChatHistory();
  chatInput.focus();
}
function showHomeView() {
  state.currentView = 'home';
  chatView.classList.remove('view-active');
  homeView.classList.add('view-active');
}

// ─── TOOL SWITCHING ───────────────────────────────────────────
function switchTool(toolId) {
  state.currentTool = toolId;

  document.querySelectorAll('.tool-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolId);
  });

  const tool = TOOLS[toolId];
  chatInput.placeholder = tool.placeholder;

  updateChatHeader();
  resetInsights();
  if (!state.chatHistories[toolId]) state.chatHistories[toolId] = [];
  renderChatHistory();
}

function updateChatHeader() {
  const tool = TOOLS[state.currentTool];
  $('chatHeaderTitle').textContent = tool.name;
  $('chatHeaderIcon').style.background = tool.gradient;
  $('chatHeaderIcon').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:white"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
  $('welcomeTitle').textContent = tool.welcomeTitle;
  $('welcomeDesc').textContent = tool.welcomeDesc;

  const chips = WELCOME_CHIP_PROMPTS[state.currentTool] || [];
  const wc = document.querySelectorAll('.welcome-chip');
  wc.forEach((c, i) => { c.textContent = chips[i] || ''; });
}

// ─── SEND MESSAGE ─────────────────────────────────────────────
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || state.isTyping) return;

  // Hide welcome
  chatWelcome.classList.add('hidden');

  // Add user message
  appendUserMessage(text);
  chatInput.value = '';
  autoResizeInput();
  sendBtn.disabled = true;
  state.isTyping = true;

  // Save to history
  addToHistory(text);
  state.totalAnalyses++;
  localStorage.setItem('ajtotal', state.totalAnalyses);
  $('statAnalyses').textContent = state.totalAnalyses;

  // Show typing indicator
  const typingEl = showTypingIndicator();

  // Simulate AI thinking delay
  await delay(1200 + Math.random() * 800);
  typingEl.remove();

  // Generate AI response
  const response = generateAIResponse(text);
  appendAIResponse(response);
  updateInsightsPanel(response);

  // Save score
  state.scores.push(response.score);
  if (state.scores.length > 20) state.scores.shift();
  const avg = Math.round(state.scores.reduce((a, b) => a + b, 0) / state.scores.length);
  $('statScore').textContent = avg;
  localStorage.setItem('ajscores', JSON.stringify(state.scores));

  sendBtn.disabled = false;
  state.isTyping = false;
  scrollChatToBottom();
}

function generateAIResponse(input) {
  const fn = AI_RESPONSES[state.currentTool];
  if (fn) return fn(input);
  return AI_RESPONSES['job-analyzer'](input);
}

// ─── MESSAGE RENDERING ────────────────────────────────────────
function appendUserMessage(text) {
  const msg = createUserMessage(text);
  messagesList.appendChild(msg);
  if (!state.chatHistories[state.currentTool]) state.chatHistories[state.currentTool] = [];
  state.chatHistories[state.currentTool].push({ role: 'user', text });
  scrollChatToBottom();
}

function createUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg user';
  el.innerHTML = `
    <div class="msg-avatar">U</div>
    <div class="msg-content">
      <div class="msg-bubble">${escapeHtml(text)}</div>
    </div>`;
  return el;
}

function appendAIResponse(data) {
  const tool = TOOLS[state.currentTool];
  const scoreColor = data.score >= 70 ? '#22c55e' : data.score >= 45 ? '#f59e0b' : '#ef4444';
  const scoreLabel = data.score >= 70 ? 'Good' : data.score >= 45 ? 'Fair' : 'Needs Work';

  const issuesHtml = data.issues.map(issue => `
    <div class="issue-item ${issue.level}">
      <span class="issue-tag">${issue.level}</span>
      <span class="issue-text">${escapeHtml(issue.text)}</span>
    </div>`).join('');

  const suggestionsHtml = `<ul>${data.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;

  const el = document.createElement('div');
  el.className = 'msg ai';
  el.innerHTML = `
    <div class="msg-avatar" style="background:${tool.gradient}">AI</div>
    <div class="msg-content" style="max-width:90%">
      <div class="ai-response-card">
        <div class="ai-card-section">
          <div class="ai-section-header">
            <div class="ai-section-icon" style="background:rgba(59,130,246,0.15)">🔍</div>
            <span class="ai-section-title">Analysis</span>
          </div>
          <div class="ai-section-content">${escapeHtml(data.analysis)}</div>
        </div>
        <div class="ai-card-section">
          <div class="ai-section-header">
            <div class="ai-section-icon" style="background:rgba(239,68,68,0.12)">⚠️</div>
            <span class="ai-section-title">Issues & Red Flags</span>
          </div>
          <div class="ai-section-content">${issuesHtml}</div>
        </div>
        <div class="ai-card-section">
          <div class="ai-section-header">
            <div class="ai-section-icon" style="background:rgba(34,197,94,0.12)">💡</div>
            <span class="ai-section-title">Suggestions</span>
          </div>
          <div class="ai-section-content">${suggestionsHtml}</div>
        </div>
        <div class="ai-card-section">
          <div class="ai-section-header">
            <div class="ai-section-icon" style="background:rgba(245,158,11,0.12)">📈</div>
            <span class="ai-section-title">Score</span>
          </div>
          <div class="score-section">
            <div class="score-bar-wrapper">
              <div class="score-bar-label"><span>${scoreLabel}</span><span>${data.score}/100</span></div>
              <div class="score-bar-track">
                <div class="score-bar-fill" style="width:0%;background:${scoreColor}" data-width="${data.score}%"></div>
              </div>
            </div>
            <div class="score-number-big" style="color:${scoreColor}">${data.score}</div>
          </div>
        </div>
      </div>
      <div class="inline-action-card">
        <span class="inline-action-text">✨ Want me to rewrite this for you?</span>
        <button class="inline-action-btn" onclick="triggerQuickAction('rewrite', this)">Rewrite →</button>
      </div>
      <div class="msg-actions">
        <button class="msg-action-btn primary" onclick="triggerQuickAction('improve', this)">✨ Improve</button>
        <button class="msg-action-btn" onclick="triggerQuickAction('analyze', this)">🔄 Analyze Again</button>
        <button class="msg-action-btn" onclick="triggerQuickAction('proposal', this)">📝 Generate Proposal</button>
        <button class="msg-action-btn" onclick="copyResponse(this)">📋 Copy</button>
        <button class="msg-action-btn" onclick="downloadResponse(this)">⬇️ Export</button>
      </div>
    </div>`;

  messagesList.appendChild(el);

  // Animate score bar
  setTimeout(() => {
    const bar = el.querySelector('.score-bar-fill');
    if (bar) bar.style.width = bar.dataset.width;
  }, 100);

  // Save to history
  if (!state.chatHistories[state.currentTool]) state.chatHistories[state.currentTool] = [];
  state.chatHistories[state.currentTool].push({ role: 'ai', data });
}

// ─── TYPING INDICATOR ─────────────────────────────────────────
function showTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ai';
  wrapper.id = 'typingIndicator';
  wrapper.innerHTML = `
    <div class="msg-avatar" style="background:${TOOLS[state.currentTool].gradient}">AI</div>
    <div class="msg-content">
      <div class="typing-indicator">
        <span class="typing-label">AI is analyzing</span>
        <div class="typing-dots">
          <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  messagesList.appendChild(wrapper);
  scrollChatToBottom();
  return wrapper;
}

// ─── QUICK ACTIONS ────────────────────────────────────────────
window.triggerQuickAction = async function(action, btn) {
  if (state.isTyping) return;
  const prompts = {
    rewrite: `Please rewrite and improve the above based on best practices for ${TOOLS[state.currentTool].name}.`,
    improve: `Give me 5 specific, actionable improvements I can make right now to maximize my score.`,
    analyze: `Analyze again with a focus on competitive positioning and what top candidates do differently.`,
    proposal: `Generate a winning proposal template based on this analysis that I can customize and use immediately.`,
  };
  const text = prompts[action] || `Take action: ${action}`;
  chatInput.value = text;
  await sendMessage();
};

window.copyResponse = function(btn) {
  const card = btn.closest('.msg-content');
  const text = card.querySelector('.ai-response-card')?.innerText || '';
  navigator.clipboard.writeText(text).then(() => showToast('Response copied!')).catch(() => showToast('Copy failed'));
};

window.downloadResponse = function(btn) {
  const card = btn.closest('.msg-content');
  const text = card.querySelector('.ai-response-card')?.innerText || '';
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ai-analysis-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Analysis exported!');
};

// ─── INSIGHTS PANEL ───────────────────────────────────────────
function updateInsightsPanel(data) {
  // Score circle
  const scoreColor = data.score >= 70 ? '#22c55e' : data.score >= 45 ? '#f59e0b' : '#ef4444';
  const circumference = 314;
  const offset = circumference - (data.score / 100) * circumference;
  const fill = $('scoreFill');
  fill.style.setProperty('--score-color', scoreColor);
  fill.style.stroke = scoreColor;
  $('scoreValue').textContent = data.score;
  $('scoreLabel').textContent = data.score >= 70 ? 'Excellent' : data.score >= 45 ? 'Fair' : 'Poor';
  setTimeout(() => { fill.style.strokeDashoffset = offset; }, 100);

  // Risk
  const riskEl = $('riskBadge');
  const riskFill = $('riskBarFill');
  const riskMap = { low: ['risk-low','#22c55e',25], medium: ['risk-medium','#f59e0b',60], high: ['risk-high','#ef4444',90] };
  const [cls, color, pct] = riskMap[data.risk] || ['risk-unknown','#6b7280',0];
  riskEl.className = `risk-badge ${cls}`;
  riskEl.textContent = data.risk.charAt(0).toUpperCase() + data.risk.slice(1) + ' Risk';
  riskFill.style.width = pct + '%';
  riskFill.style.background = color;

  // Match
  $('matchLabel').textContent = data.match + '%';
  $('matchBarFill').style.width = data.match + '%';
  $('matchBarFill').style.background = scoreColor;

  // Confidence
  const dots = document.querySelectorAll('.conf-dot');
  const confClass = data.confidence >= 4 ? 'conf-filled-3' : data.confidence >= 3 ? 'conf-filled-2' : 'conf-filled-1';
  const confLabels = ['','Very Low','Low','Moderate','High','Very High'];
  dots.forEach((d, i) => {
    d.className = 'conf-dot ' + (i < data.confidence ? confClass : 'conf-empty');
  });
  $('confLabel').textContent = confLabels[data.confidence] || '—';

  // Skills
  const skillsList = $('skillsList');
  if (data.skills && data.skills.length) {
    skillsList.innerHTML = data.skills.map(s => `
      <div class="skill-tag">
        <span>${escapeHtml(s.name)}</span>
        <span class="skill-importance ${s.importance}">${s.importance}</span>
      </div>`).join('');
  }

  // Tips
  if (data.tips && data.tips.length) {
    $('tipsCard').style.display = 'block';
    $('tipsList').innerHTML = data.tips.map(t => `<div class="tip-item">${escapeHtml(t)}</div>`).join('');
  }
}

function resetInsights() {
  $('scoreFill').style.strokeDashoffset = '314';
  $('scoreValue').textContent = '—';
  $('scoreLabel').textContent = 'Analyzing...';
  $('riskBadge').className = 'risk-badge risk-unknown';
  $('riskBadge').textContent = 'Awaiting Input';
  $('riskBarFill').style.width = '0%';
  $('matchLabel').textContent = '—';
  $('matchBarFill').style.width = '0%';
  $('confLabel').textContent = '—';
  document.querySelectorAll('.conf-dot').forEach(d => d.className = 'conf-dot conf-empty');
  $('skillsList').innerHTML = '<div class="skills-empty">Run an analysis to see skill gaps</div>';
  $('tipsCard').style.display = 'none';
}

// ─── HISTORY ─────────────────────────────────────────────────
function addToHistory(text) {
  const icons = { 'job-analyzer':'🔍', 'resume-improver':'📄', 'proposal-scorer':'✅', 'client-risk':'⚠️', 'skill-gap':'📊' };
  const entry = {
    id: Date.now(),
    tool: state.currentTool,
    icon: icons[state.currentTool] || '🤖',
    text: text.slice(0, 50) + (text.length > 50 ? '…' : ''),
    timestamp: Date.now(),
  };
  state.history.unshift(entry);
  if (state.history.length > 10) state.history.pop();
  localStorage.setItem('ajh', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<div class="history-empty">No recent queries yet</div>';
    return;
  }
  historyList.innerHTML = state.history.map(item => `
    <button class="history-item" onclick="loadHistory('${item.id}','${item.tool}')">
      <span class="history-item-icon">${item.icon}</span>
      <span class="history-item-text">${escapeHtml(item.text)}</span>
      <span class="history-item-del" onclick="deleteHistory(event,'${item.id}')">✕</span>
    </button>`).join('');
}

window.loadHistory = function(id, tool) {
  switchTool(tool);
  showChatView();
};
window.deleteHistory = function(e, id) {
  e.stopPropagation();
  state.history = state.history.filter(h => h.id != id);
  localStorage.setItem('ajh', JSON.stringify(state.history));
  renderHistory();
};

// ─── CHAT HISTORY RENDER ──────────────────────────────────────
function renderChatHistory() {
  messagesList.innerHTML = '';
  const hist = state.chatHistories[state.currentTool] || [];
  if (!hist.length) {
    chatWelcome.classList.remove('hidden');
    return;
  }
  chatWelcome.classList.add('hidden');
  hist.forEach(msg => {
    if (msg.role === 'user') messagesList.appendChild(createUserMessage(msg.text));
    else if (msg.role === 'ai' && msg.data) appendAIResponse(msg.data);
  });
  scrollChatToBottom();
}

// ─── UTILS ────────────────────────────────────────────────────
function updateStats() {
  $('statAnalyses').textContent = state.totalAnalyses;
  const scores = state.scores;
  if (scores.length) {
    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    $('statScore').textContent = avg;
  }
}
function autoResizeInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
}
function scrollChatToBottom() {
  requestAnimationFrame(() => { chatBody.scrollTop = chatBody.scrollHeight; });
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── START ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
