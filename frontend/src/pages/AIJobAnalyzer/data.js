export const TOOLS = {
  'job-analyzer': {
    id: 'job-analyzer',
    name: 'Alex, Job Strategist',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
    placeholder: 'Drop the job description here...\n\nExample: "We are looking for a Senior React Developer..."',
    welcomeTitle: 'Hi! I\'m Alex. Let\'s look at that job post together.',
    welcomeDesc: 'Paste any job description here. I\'ll read through it with you to spot red flags, estimate the real salary, and see if it\'s a good fit for you.',
    chips: ['Review this job post →', 'Is this salary fair? →', 'Any red flags? →'],
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
    id: 'resume-improver',
    name: 'Sarah, Resume Coach',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    placeholder: 'Paste your resume here...\n\nInclude your experience, skills, and education sections.',
    welcomeTitle: 'Hey! I\'m Sarah. Ready to polish up your resume?',
    welcomeDesc: 'Drop your resume in. I\'ll give you section-by-section feedback, help you pass those annoying ATS filters, and make your achievements pop.',
    chips: ['Review my resume →', 'Will this pass ATS? →', 'Make my summary better →'],
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
    id: 'proposal-scorer',
    name: 'David, Proposal Coach',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg,#14b8a6,#0d9488)',
    placeholder: 'Paste your proposal pitch here...\n\nInclude your pitch, relevant experience, and pricing.',
    welcomeTitle: 'Hi, I\'m David! Let\'s make sure this proposal lands the client.',
    welcomeDesc: 'Paste your draft proposal. I\'ll review your tone, tell you how likely you are to win, and suggest ways to make your opener irresistible.',
    chips: ['Read my proposal →', 'Make my opener stronger →', 'Help me close the deal →'],
    sample: `Hi, I'm a React developer with experience. I can do this project. I have worked on similar things before and I know React well. I will complete this on time. My rate is $50/hr. Let me know if you want to work with me. Thanks.`,
  },
  'client-risk': {
    id: 'client-risk',
    name: 'Elena, Risk Analyst',
    color: '#059669',
    gradient: 'linear-gradient(135deg,#059669,#047857)',
    placeholder: 'Paste the client\'s job post or message here...\n\nI\'ll keep an eye out for payment risks and scope creep.',
    welcomeTitle: 'Hello, I\'m Elena. Let\'s keep you safe from bad clients.',
    welcomeDesc: 'Paste a client\'s post or message. I\'ll scan it for vague scope, sketchy payment terms, and red flags so you don\'t get taken advantage of.',
    chips: ['Check this job post →', 'Read this client message →', 'Do you see any red flags? →'],
    sample: `Looking for a developer for a simple website. Should be done fast — maybe 2-3 days? I have a vision but no exact specs yet. Budget is flexible, we can discuss. I need login, e-commerce, admin dashboard, mobile app, and AI integration. Simple project. Start ASAP.`,
  },
  'skill-gap': {
    id: 'skill-gap',
    name: 'Marcus, Tech Mentor',
    color: '#34d399',
    gradient: 'linear-gradient(135deg,#34d399,#10b981)',
    placeholder: 'Tell me about your skills and target role...\n\nExample: "I know React and CSS. I want to land senior frontend jobs."',
    welcomeTitle: 'Hey there! I\'m Marcus. Let\'s figure out your next career move.',
    welcomeDesc: 'Tell me what you know and where you want to be. I\'ll map out the gaps and build you a practical roadmap to help you level up.',
    chips: ['What am I missing? →', 'Build my learning roadmap →', 'Am I ready for a senior role? →'],
    sample: `I know React, CSS, and basic JavaScript. I've been freelancing for 2 years. I want to apply for senior frontend developer jobs that pay $80k+. What am I missing?`,
  },
};

export const AI_RESPONSES = {
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

export const WELCOME_CHIP_PROMPTS = {
  'job-analyzer': ['Paste a sample job →', 'Analyze my target role →', 'Check market rate →'],
  'resume-improver': ['Paste sample resume →', 'Check ATS score →', 'Improve my summary →'],
  'proposal-scorer': ['Score sample proposal →', 'Fix my weak opener →', 'Improve close →'],
  'client-risk': ['Check sample job post →', 'Analyze this message →', 'Red flag scan →'],
  'skill-gap': ['Analyze my skill gaps →', 'Build my roadmap →', 'Compare to market →'],
};

export const ICONS = {
  'job-analyzer': '🔍',
  'resume-improver': '📄',
  'proposal-scorer': '✅',
  'client-risk': '⚠️',
  'skill-gap': '📊',
};
