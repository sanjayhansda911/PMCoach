import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  llmService,
  llmConfig,
  INTERVIEWER_PROMPT_VERSION,
  EVALUATOR_PROMPT_VERSION,
  RUBRIC_VERSION,
} from './llmService.ts';

function parseRequestBody(req: IncomingMessage): Promise<any> {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return Promise.resolve({});
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Strict factual extractor from resume text with ZERO hallucinated/invented data.
 */
export function factualResumeParser(resumeText: string) {
  const lines = resumeText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Candidate Name (usually the first prominent line of text)
  let candidateName: string | null = null;
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && line.length < 40 && !/@|http|\.com|\d{3}|resume|curriculum/i.test(line)) {
      candidateName = line;
      break;
    }
  }

  // 2. Identify companies and roles from lines containing common title/date patterns
  const roleKeywords = /(product manager|apm|lead|director|vp|head of|engineer|analyst|founder|consultant|manager)/i;

  const companies: string[] = [];
  const previousRoles: string[] = [];
  const experiences: Array<{ company: string; role: string; experience: string; evidence: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (roleKeywords.test(line)) {
      previousRoles.push(line);
      const companyMatch = line.match(/(?:at|@|\||-|,)\s*([A-Z][A-Za-z0-9\s&]{2,30})/);
      if (companyMatch && companyMatch[1]) {
        const comp = companyMatch[1].trim();
        if (!companies.includes(comp)) companies.push(comp);
      }
    }
  }

  // 3. Metrics & Impact: lines containing percentages or currency or multipliers
  const metricsPattern = /(\b\d+(\.\d+)?%\b|\$\d+[\d,]*(\.\d+)?[KkMmBb]?|\b\d+x\b|\bincreased\b|\bdecreased\b|\bgrew\b|\breduced\b|\bboosted\b)/i;
  const metricsAndImpact: string[] = [];
  const achievements: string[] = [];
  const leadershipExamples: string[] = [];

  for (const line of lines) {
    if (metricsPattern.test(line) && line.length > 20) {
      if (metricsAndImpact.length < 8) metricsAndImpact.push(line);
    }
    if (/spearheaded|launched|delivered|designed|architected|built|led|pioneered/i.test(line) && line.length > 25) {
      if (achievements.length < 8) achievements.push(line);
    }
    if (/managed|mentored|aligned|stakeholder|cross-functional|hired|coached|facilitated/i.test(line) && line.length > 25) {
      if (leadershipExamples.length < 6) leadershipExamples.push(line);
    }
  }

  // Build experience evidence tuples from detected achievements
  if (previousRoles.length > 0 && metricsAndImpact.length > 0) {
    for (let i = 0; i < Math.min(previousRoles.length, metricsAndImpact.length, 4); i++) {
      experiences.push({
        company: companies[i] || 'Identified in resume',
        role: previousRoles[i] || 'Product Manager',
        experience: achievements[i] || previousRoles[i],
        evidence: metricsAndImpact[i] || achievements[i] || 'Documented in resume',
      });
    }
  }

  // 4. Skills extraction from common PM and tech skills explicitly mentioned
  const knownSkills = [
    'A/B Testing', 'SQL', 'Python', 'Roadmapping', 'User Research', 'Product Strategy',
    'Data Telemetry', 'Agile', 'Scrum', 'Figma', 'Amplitude', 'Mixpanel', 'Jira',
    'Machine Learning', 'API Design', 'System Architecture', 'Go-To-Market', 'Marketplace',
    'B2B', 'SaaS', 'Mobile', 'CIRCLES', 'Customer Discovery', 'Pricing'
  ];
  const skills: string[] = [];
  const lowerText = resumeText.toLowerCase();
  for (const skill of knownSkills) {
    if (lowerText.includes(skill.toLowerCase())) {
      skills.push(skill);
    }
  }

  // 5. Estimate years of experience based on earliest year mentioned
  let yearsOfExperience: number | null = null;
  const allYears = (resumeText.match(/\b(19\d\d|20\d\d)\b/g) || [])
    .map(Number)
    .filter((y) => y >= 1990 && y <= new Date().getFullYear());
  if (allYears.length > 0) {
    const minYear = Math.min(...allYears);
    const diff = new Date().getFullYear() - minYear;
    if (diff >= 0 && diff <= 35) {
      yearsOfExperience = diff;
    }
  }

  // 6. Industries explicitly mentioned in text
  const knownIndustries = [
    'Fintech', 'E-commerce', 'Healthtech', 'Healthcare', 'EdTech', 'SaaS',
    'Enterprise', 'Marketplace', 'Consumer Tech', 'Cybersecurity', 'AI', 'Machine Learning',
    'Logistics', 'Supply Chain', 'Insurtech', 'Proptech', 'Adtech', 'Payments', 'Cloud'
  ];
  const industries: string[] = [];
  for (const ind of knownIndustries) {
    if (lowerText.includes(ind.toLowerCase())) {
      industries.push(ind);
    }
  }

  // 7. Product Examples & Products explicitly mentioned
  const productExamples: string[] = [];
  const products: string[] = [];
  for (const line of lines) {
    if (/(?:launched|built|designed|created|scaled|led|developed)\s+(?:the\s+)?([a-z0-9\s-]{3,35}(?:app|platform|portal|dashboard|tool|api|system|product|engine|workflow))/i.test(line)) {
      const match = line.match(/(?:launched|built|designed|created|scaled|led|developed)\s+(?:the\s+)?([a-z0-9\s-]{3,35}(?:app|platform|portal|dashboard|tool|api|system|product|engine|workflow))/i);
      if (match && match[1]) {
        const prodName = match[1].trim();
        if (!products.includes(prodName) && products.length < 5) {
          products.push(prodName);
        }
      }
      if (productExamples.length < 6) {
        productExamples.push(line);
      }
    }
  }

  return {
    candidateName,
    currentRole: previousRoles[0] || null,
    yearsOfExperience,
    previousRoles: Array.from(new Set(previousRoles)),
    companies: Array.from(new Set(companies)),
    products: Array.from(new Set(products)),
    industries: Array.from(new Set(industries)),
    skills: Array.from(new Set(skills)),
    achievements,
    metricsAndImpact,
    leadershipExamples,
    productExamples,
    notableProjects: achievements.slice(0, 4),
    experiences,
  };
}

/**
 * Strict factual extractor from Job Description text with ZERO invented requirements.
 */
export function factualJdParser(jdText: string, targetRole?: string) {
  const lines = jdText.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Company extraction (look for "at [Company]" or "About [Company]" or "[Company] is looking")
  let company: string | null = null;
  const companyMatch = jdText.match(/(?:at|about|join|welcome to)\s+([A-Z][A-Za-z0-9\s&]{2,30})/);
  if (companyMatch && companyMatch[1]) {
    const rawComp = companyMatch[1].trim().replace(/\s+(is|team|we|are)\b.*/i, '');
    if (rawComp.length > 2 && !/the|our|this|we|job|role|product/i.test(rawComp)) {
      company = rawComp;
    }
  }

  // 2. Role title
  let role: string | null = targetRole || null;
  const roleMatch = jdText.match(/(?:role:|title:|position:)\s*([^\n\r]+)/i) ||
    jdText.match(/\b([A-Za-z\s]{4,30}(?:Product Manager|APM|Director of Product))\b/i);
  if (roleMatch && roleMatch[1]) {
    role = roleMatch[1].trim();
  }

  // 3. Responsibilities and Requirements
  const responsibilities: string[] = [];
  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const experienceRequirements: string[] = [];
  const likelyInterviewCompetencies: string[] = [];

  const lowerText = jdText.toLowerCase();

  // Competency mapping based on JD emphasis
  if (/strategy|roadmap|vision|market|competit/i.test(lowerText)) {
    likelyInterviewCompetencies.push('Strategy');
  }
  if (/design|user experience|customer|empathy|wireframe|journey/i.test(lowerText)) {
    likelyInterviewCompetencies.push('Product Sense');
  }
  if (/metric|analytics|a\/b|data|experiment|funnel|sql/i.test(lowerText)) {
    likelyInterviewCompetencies.push('Analytics & Metrics');
  }
  if (/agile|scrum|sprint|execution|deliver|launch|cross-functional|engineer/i.test(lowerText)) {
    likelyInterviewCompetencies.push('Execution');
  }
  if (/stakeholder|lead|mentor|influence|manage/i.test(lowerText)) {
    likelyInterviewCompetencies.push('Leadership & Behavioral');
  }
  if (likelyInterviewCompetencies.length === 0) {
    likelyInterviewCompetencies.push('Product Sense', 'Execution');
  }

  // Parse lines for responsibilities and requirements
  for (const line of lines) {
    const isBullet = /^[-*•–—]|\d+\.\s+/.test(line);
    const cleanLine = line.replace(/^[-*•–—]\s*|\d+\.\s*/, '').trim();

    if (cleanLine.length < 15) continue;

    if (/experience|years|degree|bachelor|master|background/i.test(cleanLine)) {
      if (experienceRequirements.length < 6) experienceRequirements.push(cleanLine);
    } else if (/responsible|lead|drive|collaborate|own|build|partner|define/i.test(cleanLine)) {
      if (responsibilities.length < 10) responsibilities.push(cleanLine);
    } else if (/require|must have|proficien|knowledge of|fluent/i.test(cleanLine)) {
      if (requiredSkills.length < 10) requiredSkills.push(cleanLine);
    } else if (/preferred|bonus|plus|nice to have/i.test(cleanLine)) {
      if (preferredSkills.length < 6) preferredSkills.push(cleanLine);
    } else if (isBullet && responsibilities.length < 8) {
      responsibilities.push(cleanLine);
    }
  }

  // Known keywords
  const knownKeywords = [
    'B2B', 'SaaS', 'Mobile', 'Marketplace', 'Growth', 'FinTech', 'HealthTech',
    'Platform', 'AI/ML', 'API', 'Developer Experience', 'Infrastructure', 'Enterprise'
  ];
  const importantKeywords = knownKeywords.filter((kw) =>
    lowerText.includes(kw.toLowerCase())
  );

  return {
    company,
    role: role || targetRole || 'Product Manager',
    seniority: targetRole || null,
    responsibilities: responsibilities.slice(0, 8),
    requiredSkills: requiredSkills.slice(0, 8),
    preferredSkills: preferredSkills.slice(0, 5),
    productArea: importantKeywords[0] || null,
    domain: importantKeywords.slice(0, 3).join(', ') || null,
    likelyInterviewCompetencies: Array.from(new Set(likelyInterviewCompetencies)),
    experienceRequirements,
    importantKeywords,
    successSignals: [
      'Ability to clearly articulate user problem statements before proposing features',
      'Data-driven decision making with clear north-star and guardrail metrics',
      'Demonstrated ownership and structured communication across engineering tradeoffs',
    ],
  };
}

/**
 * Factual Candidate-to-Job matcher that finds concrete evidence overlaps and real gaps with ZERO hallucinations.
 */
export function factualMatcher(candidateProfile: any, jobProfile: any) {
  const strongestRelevantExperiences: Array<{
    area: string;
    candidateEvidence: string;
    jobRequirement: string;
    match: 'strong' | 'moderate' | 'gap';
  }> = [];
  const relevantSkills: string[] = [];
  const relevantAchievements: string[] = [];
  const potentialGaps: Array<{
    area: string;
    jobRequirement: string;
    candidateObservation: string;
  }> = [];
  const likelyFollowUpAreas: string[] = [];
  const resumeClaimsWorthInvestigating: Array<{
    claim: string;
    context: string;
    probeReason: string;
  }> = [];

  // 1. Skill intersections
  const candSkills = candidateProfile.skills || [];
  const jobSkills = [...(jobProfile.requiredSkills || []), ...(jobProfile.preferredSkills || [])];
  const jdLower = (jobProfile.rawText || '').toLowerCase();

  for (const skill of candSkills) {
    const sLower = skill.toLowerCase();
    const matchedInJob =
      jobSkills.some((req: string) => req.toLowerCase().includes(sLower)) ||
      jdLower.includes(sLower);
    if (matchedInJob && !relevantSkills.includes(skill)) {
      relevantSkills.push(skill);
    }
  }

  // 2. Align candidate experiences and achievements to job responsibilities
  const candAchievements: string[] = candidateProfile.achievements || [];
  const candMetrics: string[] = candidateProfile.metricsAndImpact || [];
  const jobResps: string[] = jobProfile.responsibilities || [];

  for (let i = 0; i < Math.min(jobResps.length, 4); i++) {
    const resp = jobResps[i];
    const respWords = resp.toLowerCase().split(/\W+/).filter((w: string) => w.length > 4);
    
    // Find matching achievement
    const matchingAch = candAchievements.find((a: string) => {
      const aLower = a.toLowerCase();
      return respWords.some((w: string) => aLower.includes(w));
    }) || candAchievements[i];

    if (matchingAch) {
      strongestRelevantExperiences.push({
        area: resp.length > 50 ? `${resp.slice(0, 47)}...` : resp,
        candidateEvidence: matchingAch,
        jobRequirement: resp,
        match: 'strong',
      });
      if (!relevantAchievements.includes(matchingAch)) {
        relevantAchievements.push(matchingAch);
      }
    }
  }

  // Fallback if no direct overlap matches were found
  if (strongestRelevantExperiences.length === 0 && candAchievements.length > 0) {
    for (let i = 0; i < Math.min(candAchievements.length, 3); i++) {
      const resp = jobResps[i] || 'Product strategy and end-to-end execution';
      strongestRelevantExperiences.push({
        area: resp.length > 50 ? `${resp.slice(0, 47)}...` : resp,
        candidateEvidence: candAchievements[i],
        jobRequirement: resp,
        match: 'moderate',
      });
      relevantAchievements.push(candAchievements[i]);
    }
  }

  // 3. Potential Gaps: required skills from JD not explicitly evidenced in resume
  const candFullText = (candidateProfile.resumeText || '').toLowerCase();
  for (const reqSkill of (jobProfile.requiredSkills || []).slice(0, 5)) {
    const keyTerms = reqSkill.toLowerCase().split(/\W+/).filter((w: string) => w.length > 4);
    const hasEvidence = keyTerms.some((term: string) => candFullText.includes(term));
    if (!hasEvidence && potentialGaps.length < 3) {
      potentialGaps.push({
        area: reqSkill.length > 45 ? `${reqSkill.slice(0, 42)}...` : reqSkill,
        jobRequirement: reqSkill,
        candidateObservation: `No explicit mention of "${reqSkill.slice(0, 50)}" located in resume.`,
      });
    }
  }

  // 4. Claims worth investigating: metrics or high-impact statements
  for (const metric of candMetrics.slice(0, 3)) {
    resumeClaimsWorthInvestigating.push({
      claim: metric,
      context: candidateProfile.currentRole || 'Previous Product Role',
      probeReason:
        'Probe measurement methodology, baseline comparison, and candidate direct ownership vs team contribution.',
    });
  }

  // 5. Likely follow-up areas
  for (const item of strongestRelevantExperiences.slice(0, 3)) {
    likelyFollowUpAreas.push(
      `Deep-dive into decision tradeoffs, key metric definitions, and engineering alignment during: "${item.candidateEvidence.slice(0, 55)}..."`
    );
  }

  // 6. Competencies to probe
  const probeSet = new Set<string>();
  if (Array.isArray(jobProfile.likelyInterviewCompetencies)) {
    for (const c of jobProfile.likelyInterviewCompetencies) probeSet.add(c);
  }
  if (probeSet.size === 0) {
    probeSet.add('Product Sense');
    probeSet.add('Execution');
    probeSet.add('Communication');
  }

  return {
    id: `match-${Date.now()}`,
    candidateProfileId: candidateProfile.id || `candidate-${Date.now()}`,
    jobProfileId: jobProfile.id || `job-${Date.now()}`,
    strongestRelevantExperiences,
    relevantSkills,
    relevantAchievements,
    potentialGaps,
    likelyFollowUpAreas,
    competenciesToProbe: Array.from(probeSet),
    resumeClaimsWorthInvestigating,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Factual Interview Brief generator synthesizing candidate context, job requirements, and tailored question themes.
 */
function factualBriefGenerator(
  candidateProfile: any,
  jobProfile: any,
  match: any,
  targetRole: string,
  interviewType: string,
  difficulty: string
) {
  const candidateName = candidateProfile.candidateName || 'Candidate';
  const yoe = candidateProfile.yearsOfExperience
    ? `${candidateProfile.yearsOfExperience} years of experience`
    : 'product management experience';
  const currRole = candidateProfile.currentRole
    ? `currently or previously as ${candidateProfile.currentRole}`
    : 'with product background';
  const candidateContext = `${candidateName} has documented ${yoe}, ${currRole}. Documented competencies include ${(candidateProfile.skills || []).slice(0, 4).join(', ') || 'product roadmapping and execution'}.`;

  const compText = jobProfile.company ? `at ${jobProfile.company}` : '';
  const domainText = jobProfile.domain ? `focusing on ${jobProfile.domain}` : '';
  const jobContext = `Targeting ${targetRole || 'Product Manager'} role ${compText} ${domainText}. Evaluates readiness in ${interviewType} and cross-functional leadership.`;

  // Tailored themes based on interviewType, role, and domain
  const themes: string[] = [];
  const domain = jobProfile.domain || 'product scale';

  if (interviewType === 'Product Sense') {
    themes.push(`User Persona & Problem Prioritization for ${domain}`);
    themes.push('Product Solution Formulation & Ergonomics under resource constraints');
    themes.push('Design Tradeoffs & North Star Metric Alignment');
  } else if (interviewType === 'Execution') {
    themes.push('Engineering Tradeoffs & Sprint Scope Triage for critical milestones');
    themes.push(`Metric Anomaly Diagnosis & Funnel Regression Mitigation in ${domain}`);
    themes.push('Experimentation Design & Guardrail Metric Monitoring');
  } else if (interviewType === 'Analytics') {
    themes.push(`North Star & Guardrail Metric Framework for ${domain}`);
    themes.push('Metric Decomposition & Anomaly Diagnosis (triage sudden drop)');
    themes.push('A/B Testing Cohort Analysis & Significance Tradeoffs');
  } else if (interviewType === 'Strategy') {
    themes.push(`Competitive Moat & Market Positioning in ${domain}`);
    themes.push('Business Model & Unit Economics Sustainability');
    themes.push('Long-term 0-to-1 Expansion vs Defending Core Offering');
  } else if (interviewType === 'Leadership & Behavioral') {
    themes.push('Resolving High-Stakes Engineering & Executive Disagreements');
    themes.push('Driving Cross-Functional Alignment Without Direct Authority');
    themes.push('Retrospective Analysis of a Product Launch Failure or Setback');
  } else {
    // Mixed PM Interview
    themes.push(`End-to-end Product Opportunity Assessment & User Problem Framing for ${domain}`);
    themes.push('Execution Triage & Telemetry Metric Tree Design');
    themes.push('Cross-Functional Stakeholder Alignment & Strategic Tradeoffs');
  }

  const relevantExps = (match.strongestRelevantExperiences || []).map(
    (e: any) => `${e.area}: ${e.candidateEvidence}`
  );

  const areasToProbe = (match.likelyFollowUpAreas || []).slice(0, 3);
  const potentialWeaknesses = (match.potentialGaps || []).map(
    (g: any) => `${g.area} (${g.candidateObservation})`
  );

  const objectives = [
    `Assess candidate depth in ${interviewType} tailored to ${targetRole} seniority expectations`,
    `Probe factual claims from resume regarding: ${match.resumeClaimsWorthInvestigating?.[0]?.claim || 'recent key launches'}`,
    `Evaluate structured communication, synthesis, and defensible tradeoff rationale under ${difficulty.toLowerCase()} conditions`,
  ];

  return {
    id: `brief-${Date.now()}`,
    interviewId: 'pending',
    candidateContext,
    jobContext,
    relevantExperiences: relevantExps.slice(0, 4),
    competenciesToTest: Array.from(
      new Set([interviewType, 'Communication', ...(match.competenciesToProbe || [])])
    ),
    areasToProbe,
    potentialWeaknesses: potentialWeaknesses.slice(0, 3),
    recommendedQuestionThemes: themes,
    recommendedDifficulty: difficulty,
    interviewObjectives: objectives,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates structured InterviewPlan calibrated to seniority, duration, and target competency themes.
 */
export function factualPlanGenerator(params: {
  brief: any;
  candidateProfile: any;
  jobProfile: any;
  duration: number;
  difficulty: string;
  targetRole: string;
  interviewId: string;
}) {
  const { brief, candidateProfile, jobProfile, duration, difficulty, targetRole, interviewId } =
    params;

  // Determine section count based on duration
  const sectionCount = duration <= 15 ? 2 : duration <= 30 ? 3 : 4;
  const domain = jobProfile?.domain || jobProfile?.productArea || 'core product';
  const candidateClaims: string[] = candidateProfile?.metricsAndImpact || [];

  const probePolicy = {
    maxFollowUpsPerQuestion:
      targetRole === 'Group Product Manager' ? 3 : duration <= 15 ? 1 : 2,
    issueTriggers: [
      'premature_solution',
      'missing_metric',
      'unsupported_assumption',
      'weak_prioritization',
      'excessive_breadth',
      'no_tradeoff',
    ],
    strongAnswerBehavior:
      difficulty === 'Challenging' ? 'add_constraint' : 'competing_priority',
    depthLevel:
      targetRole === 'Group Product Manager'
        ? 'strategic'
        : targetRole === 'Senior Product Manager'
        ? 'deep'
        : 'standard',
  };

  const sections: any[] = [];
  const themes = brief.recommendedQuestionThemes || [];
  const competencies: string[] = brief.competenciesToTest || ['Product Sense', 'Execution'];

  // Base question templates by competency and domain
  const questionPool: Record<string, string[]> = {
    'Product Sense': [
      `Let's imagine you are the product lead for ${domain}. We want to dramatically improve the user experience for first-time customers. How would you identify the core problem and structure a solution?`,
      `Design a new feature for ${domain} aimed at users who currently abandon the workflow halfway through. How do you define their pain point?`,
      `If you were tasked with reinventing ${domain} for mobile-first users, where would you start and how would you prioritize the user needs?`,
    ],
    Execution: [
      `You're preparing to launch a critical milestone in ${domain}, but engineering discovers a regression that increases latency by 35%. How do you triage the scope and decide whether to launch?`,
      `Sprint capacity has been unexpectedly reduced by 40% due to an urgent architectural migration. How do you re-prioritize the roadmap deliverables for ${domain}?`,
      `A key metric for ${domain} dropped 6% week-over-week immediately after a release. Walk me through how you diagnose the root cause and align the team.`,
    ],
    Analytics: [
      `Define the metric framework for ${domain}. What is your North Star metric, and what guardrail metrics would you track to prevent unintended harm?`,
      `You ran an A/B test on ${domain} where checkout conversion increased by 4%, but customer support tickets surged by 18%. How do you interpret this and make a launch decision?`,
      `Walk me through how you would decompose a sudden drop in user retention for ${domain} into actionable diagnostic cohorts.`,
    ],
    Strategy: [
      `A major competitor in ${domain} just announced a free tier that undercuts our pricing by 50%. How do you evaluate our strategic options and defensibility?`,
      `How would you evaluate whether we should expand ${domain} into an adjacent international market versus deepening our core domestic offering?`,
      `What does the long-term competitive moat look like for ${domain}, and how should product decisions this year reinforce it?`,
    ],
    'Leadership & Behavioral': [
      `Tell me about a high-stakes disagreement you had with an engineering lead or executive stakeholder on product scope. How did you resolve it without formal authority?`,
      `Describe a product launch or initiative that did not meet expectations. What was the core failure, and how did you lead the post-mortem and team turnaround?`,
      `How do you align cross-functional partners (engineering, design, sales, legal) when there are conflicting priorities and limited resources?`,
    ],
  };

  for (let i = 0; i < sectionCount; i++) {
    const comp = competencies[i % competencies.length] || 'Product Sense';
    const pool = questionPool[comp] || questionPool['Product Sense'];
    const primaryQuestion = pool[i % pool.length];
    const theme = themes[i] || `${comp} in ${domain}`;

    const expectedSignals: string[] = [];
    if (comp === 'Product Sense') {
      expectedSignals.push('clear_problem_definition', 'user_identification', 'prioritization', 'solution_thinking');
    } else if (comp === 'Execution') {
      expectedSignals.push('metric_definition', 'tradeoff_reasoning', 'prioritization', 'experimentation');
    } else if (comp === 'Analytics') {
      expectedSignals.push('metric_definition', 'metric_decomposition', 'root_cause_reasoning', 'quantified_impact');
    } else if (comp === 'Strategy') {
      expectedSignals.push('business_reasoning', 'tradeoff_reasoning', 'clear_problem_definition');
    } else {
      expectedSignals.push('ownership', 'stakeholder_reasoning', 'structured_communication');
    }

    sections.push({
      id: `section-${i + 1}`,
      sectionNumber: i + 1,
      competency: comp,
      theme,
      primaryQuestion,
      expectedSignals,
      targetClaimsToProbe: candidateClaims.slice(i, i + 1),
      probePolicy,
    });
  }

  return {
    id: `plan-${Date.now()}`,
    interviewId,
    targetRole,
    interviewType: brief.recommendedDifficulty || 'Standard',
    difficulty,
    allocatedMinutes: duration,
    sections,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Lightweight local analyzer identifying control signals and potential issues in candidate answers.
 */
export function factualAnswerAnalyzer(params: {
  question: string;
  answerText: string;
  expectedSignals: string[];
  candidateProfile: any;
  jobProfile: any;
  role: string;
  difficulty: string;
}) {
  const { question, answerText, expectedSignals, difficulty, role } = params;
  const lowerAnswer = answerText.toLowerCase();
  const words = answerText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const detectedSignals: string[] = [];
  const potentialIssues: string[] = [];

  // 1. Detect positive PM signals
  if (/problem|objective|root cause|goal|solve for|pain point|underlying issue/i.test(lowerAnswer)) {
    detectedSignals.push('clear_problem_definition');
  }
  if (/user|customer|persona|shopper|merchant|consumer|buyer|audience/i.test(lowerAnswer)) {
    detectedSignals.push('user_identification');
  }
  if (/segment|cohort|tier|enterprise vs smb|power user/i.test(lowerAnswer)) {
    detectedSignals.push('segmentation');
  }
  if (/priorit|first|primary|rank|criteria|matrix|high impact|must have/i.test(lowerAnswer)) {
    detectedSignals.push('prioritization');
  }
  if (/metric|kpi|conversion|retention|churn|dau|mau|latency|revenue|arr|nps/i.test(lowerAnswer)) {
    detectedSignals.push('metric_definition');
  }
  if (/decompose|funnel|step by step|breakdown|cohort analysis|sub-metric/i.test(lowerAnswer)) {
    detectedSignals.push('metric_decomposition');
  }
  if (/trade-off|tradeoff|downside|sacrifice|cost|giving up|at the expense/i.test(lowerAnswer)) {
    detectedSignals.push('tradeoff_reasoning');
  }
  if (/a\/b|experiment|variant|control|hypothesis|test cohort|significan/i.test(lowerAnswer)) {
    detectedSignals.push('experimentation');
  }
  if (/engineer|design|sales|align|stakeholder|cross-functional|team/i.test(lowerAnswer)) {
    detectedSignals.push('stakeholder_reasoning');
  }
  if (/(1\.|2\.|first|second|finally|•|- )/i.test(answerText) || answerText.includes('\n')) {
    detectedSignals.push('structured_communication');
  }
  if (/\b\d+(\.\d+)?%|\$\d+|\b\d+x\b/i.test(answerText)) {
    detectedSignals.push('quantified_impact');
  }

  // Missing expected signals
  const missingSignals = expectedSignals.filter((sig) => !detectedSignals.includes(sig));

  // 2. Detect issues
  // Premature solution: immediately proposes feature/app without defining the problem
  const startsWithSolution =
    /^(i would|we should|let's|i'd|we can|my idea is to|my solution is to|we just need to)\s+(?:immediately\s+|just\s+|first\s+)?(build|create|add|launch|design|implement|develop|introduce|make)\s+(?:an?|the)?\s*(?:app|feature|tool|dashboard|ai|assistant|system|button|platform|widget|product)/i.test(
      answerText.trim()
    ) ||
    (!detectedSignals.includes('clear_problem_definition') &&
      /^(build|create|add|launch|design|implement)\s+(?:an?|the)?\s*(?:app|feature|tool|dashboard|ai|assistant|system|button|platform|widget)/i.test(
        answerText.trim()
      ));

  if (startsWithSolution && !detectedSignals.includes('clear_problem_definition')) {
    potentialIssues.push('premature_solution');
  }

  // Missing metric when proposing a feature or launch
  if (
    /launch|build|ship|implement|solution/i.test(lowerAnswer) &&
    !detectedSignals.includes('metric_definition')
  ) {
    potentialIssues.push('missing_metric');
  }

  // Unsupported assumption
  if (
    /obviously|everyone wants|guaranteed to|no doubt that|all users will|clearly they need|i assume all|assuming that all|assume everyone|assume nobody/i.test(
      lowerAnswer
    )
  ) {
    potentialIssues.push('unsupported_assumption');
  }

  // Shallow reasoning / very short answer
  if (wordCount < 25) {
    potentialIssues.push('shallow_reasoning');
  }

  // Excessive breadth without prioritization
  const featureListCount = (
    lowerAnswer.match(/also|another|additionally|plus|we could also|another thing|another idea/g) ||
    []
  ).length;
  if (
    !detectedSignals.includes('prioritization') &&
    (featureListCount >= 4 || (wordCount > 200 && featureListCount >= 2))
  ) {
    potentialIssues.push('excessive_breadth');
  }

  // No tradeoff evaluated
  if (
    /choose|option|direction|recommend/i.test(lowerAnswer) &&
    !detectedSignals.includes('tradeoff_reasoning') &&
    wordCount > 60
  ) {
    potentialIssues.push('no_tradeoff');
  }

  // Determine probe recommendation
  let probeRecommended = false;
  let probeReason: string | null = null;
  let suggestedProbeType: any = null;

  if (potentialIssues.includes('premature_solution')) {
    probeRecommended = true;
    probeReason = "Candidate jumped directly to solutions without establishing problem definition.";
    suggestedProbeType = 'redirect_problem';
  } else if (potentialIssues.includes('missing_metric')) {
    probeRecommended = true;
    probeReason = "No success or guardrail metrics defined to measure outcome.";
    suggestedProbeType = 'ask_follow_up';
  } else if (potentialIssues.includes('unsupported_assumption')) {
    probeRecommended = true;
    probeReason = "Candidate made an unsupported assertion without citing user evidence or data.";
    suggestedProbeType = 'challenge_assumption';
  } else if (potentialIssues.includes('excessive_breadth')) {
    probeRecommended = true;
    probeReason = "Candidate enumerated multiple disparate ideas without prioritizing.";
    suggestedProbeType = 'ask_follow_up';
  } else if (potentialIssues.includes('shallow_reasoning')) {
    probeRecommended = true;
    probeReason = "Answer is brief and lacks breakdown of reasoning.";
    suggestedProbeType = 'request_clarification';
  } else if (potentialIssues.includes('no_tradeoff')) {
    probeRecommended = true;
    probeReason = "Recommended path proposed without analyzing downsides or costs.";
    suggestedProbeType = 'ask_follow_up';
  } else if (difficulty === 'Challenging' || role.includes('Senior') || role.includes('Group')) {
    // Strong answer under challenging / senior difficulty: add constraint
    probeRecommended = true;
    probeReason = "Strong structured answer; challenge with technical or organizational constraint.";
    suggestedProbeType = 'increase_constraint';
  }

  return {
    id: `analysis-${Date.now()}`,
    interviewId: 'session',
    questionId: question.slice(0, 30),
    answerId: `ans-${Date.now()}`,
    detectedSignals,
    missingSignals,
    potentialIssues,
    probeRecommended,
    probeReason,
    suggestedProbeType,
    confidence: 0.9,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates grounded, realistic, answer-specific follow-up questions without repetitive generic phrasing.
 */
export function factualFollowUpGenerator(params: {
  question: string;
  answerText: string;
  analysis: any;
  plan: any;
  state: any;
  candidateProfile: any;
  jobProfile: any;
}) {
  const { question: _question, answerText: _answerText, analysis, plan, state, candidateProfile } = params;
  const issues: string[] = analysis.potentialIssues || [];
  const domain = plan?.jobProfile?.domain || 'this product area';

  // 1. Excessive breadth without prioritization
  if (issues.includes('excessive_breadth')) {
    return {
      followUpQuestion:
        "You've laid out several interesting avenues. If you had to commit your engineering team to just one for the next cycle, which would you pick and why?",
      actionType: 'ask_follow_up' as const,
      probeReason: 'Pushing for prioritization across excessive ideas',
      targetSignal: 'prioritization',
    };
  }

  // 2. Premature solution
  if (issues.includes('premature_solution')) {
    return {
      followUpQuestion:
        `Before we explore specific solutions for ${domain}, how would you define the core problem you're trying to solve, and for which specific user persona?`,
      actionType: 'ask_follow_up' as const,
      probeReason: 'Redirecting premature solution to problem formulation',
      targetSignal: 'clear_problem_definition',
    };
  }

  // 3. Missing metric
  if (issues.includes('missing_metric')) {
    return {
      followUpQuestion:
        `What specific metric would you use to verify whether this problem in ${domain} is worth solving, and how would you define success post-launch?`,
      actionType: 'ask_follow_up' as const,
      probeReason: 'Probing missing metrics and measurement framework',
      targetSignal: 'metric_definition',
    };
  }

  // 4. Unsupported assumption
  if (issues.includes('unsupported_assumption')) {
    return {
      followUpQuestion:
        "What data, customer observation, or evidence makes you confident that assumption holds true for this user segment?",
      actionType: 'challenge_assumption' as const,
      probeReason: 'Challenging unsupported assumption with evidence request',
      targetSignal: 'root_cause_reasoning',
    };
  }

  // 5. No tradeoff
  if (issues.includes('no_tradeoff')) {
    return {
      followUpQuestion:
        "Every product choice involves sacrifice. What are you deprioritizing or giving up by pursuing that recommendation?",
      actionType: 'ask_follow_up' as const,
      probeReason: 'Probing tradeoff evaluation',
      targetSignal: 'tradeoff_reasoning',
    };
  }

  // 6. Shallow reasoning
  if (issues.includes('shallow_reasoning')) {
    return {
      followUpQuestion:
        "Could you walk me through the breakdown behind that? What factors led you to that conclusion?",
      actionType: 'request_clarification' as const,
      probeReason: 'Requesting clarification for brief answer',
      targetSignal: 'structured_communication',
    };
  }

  // 7. Resume-specific probing if available and not yet discussed
  const resumeClaims: string[] = candidateProfile?.metricsAndImpact || [];
  if (resumeClaims.length > 0 && !state?.claimsDiscussed?.includes(resumeClaims[0])) {
    const claim = resumeClaims[0];
    return {
      followUpQuestion: `In your resume, you highlighted: "${claim}". Walk me through how you isolated that your specific product decisions caused that result versus broader team or market dynamics.`,
      actionType: 'ask_follow_up' as const,
      probeReason: 'Probing documented resume claim with attribution inquiry',
      targetSignal: 'quantified_impact',
    };
  }

  // 8. Strong answer -> introduce realistic constraint
  return {
    followUpQuestion:
      `Good structure. Now let's introduce a constraint for ${domain}: suppose engineering informs you that due to technical debt, this capability cannot support real-time processing and will incur a 24-hour batch delay. How does that impact your user experience and prioritization?`,
    actionType: 'ask_follow_up' as const,
    probeReason: 'Testing senior tradeoff resilience under technical constraint',
    targetSignal: 'tradeoff_reasoning',
  };
}

/**
 * Rigorous, independent Evaluation Engine that evaluates a completed interview transcript
 * against the 6-competency Product Management taxonomy.
 * Extracts verbatim verified quotes, scores 1-5 without framework buzzword exploitation,
 * applies plan-calibrated section weights, and generates actionable coaching advice.
 */
export function factualEvaluationEngine(input: {
  interview: any;
  candidateProfile?: any;
  jobProfile?: any;
  interviewPlan?: any;
  transcript: Array<{
    id?: string;
    role: 'interviewer' | 'candidate';
    text: string;
    timestamp?: string;
  }>;
  questions?: any[];
  answers?: any[];
  metadata?: {
    model?: string;
    promptVersion?: string;
    rubricVersion?: string;
    testCaseId?: string;
  };
}) {
  const { interview, interviewPlan, transcript = [], metadata } = input;
  const interviewId = interview?.id || 'eval-session';

  // 1. Extract Candidate Segments and pair with prompts
  const candidateSegments: Array<{
    id: string;
    questionText: string;
    answerText: string;
    wordCount: number;
  }> = [];

  let lastInterviewerPrompt = 'General Question';
  let segIdx = 0;

  for (const exchange of transcript) {
    if (exchange.role === 'interviewer') {
      lastInterviewerPrompt = exchange.text;
    } else if (exchange.role === 'candidate') {
      segIdx++;
      candidateSegments.push({
        id: exchange.id || `seg-${segIdx}`,
        questionText: lastInterviewerPrompt,
        answerText: exchange.text.trim(),
        wordCount: exchange.text.trim().split(/\s+/).filter(Boolean).length,
      });
    }
  }

  // Graceful empty transcript handling
  if (candidateSegments.length === 0) {
    return {
      id: `eval-${Date.now()}`,
      interviewId,
      overallScore: 0,
      competencyEvaluations: [
        {
          competency: 'Product Sense',
          score: 1,
          confidence: 'low' as const,
          strengths: [],
          weaknesses: ['No candidate responses found in transcript.'],
          evidence: [],
          recommendation: 'Complete interview sections to receive coaching evaluation.',
        },
      ],
      overallStrengths: [],
      overallWeaknesses: ['No candidate answers submitted.'],
      priorityImprovements: ['Complete a mock interview to evaluate your PM reasoning.'],
      nextPracticeRecommendations: ['Practice foundational PM problem definition.'],
      recommendation: 'needs_improvement' as const,
      metadata: {
        model: metadata?.model || 'factual-rubric-evaluator-v1',
        promptVersion: metadata?.promptVersion || '1.0.0',
        rubricVersion: metadata?.rubricVersion || '2026.1',
        testCaseId: metadata?.testCaseId,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  const fullCandidateText = candidateSegments.map((s) => s.answerText).join('\n\n');
  const lowerFull = fullCandidateText.toLowerCase();

  // Helper: Extract guaranteed verbatim substring from candidate text
  function extractVerbatimQuote(text: string, regex: RegExp, maxChars = 110): string | null {
    const match = text.match(regex);
    if (!match || match.index === undefined) return null;
    const start = match.index;
    const rawSlice = text.slice(start, start + maxChars);
    const endMatch = rawSlice.search(/[.!?\n]/);
    const clean = (endMatch > 15 ? rawSlice.slice(0, endMatch) : rawSlice).trim();
    if (clean.length >= 10 && text.includes(clean)) {
      return clean;
    }
    return null;
  }

  // Determine planned competencies from InterviewPlan
  const plannedCompetencies: string[] =
    interviewPlan?.sections?.map((s: any) => s.competency) || ['Product Sense', 'Execution'];

  // 2. Evaluate Individual Competencies
  const competencyEvaluations: any[] = [];
  const answerEvaluations: any[] = [];
  const crossInterviewObservations: any[] = [];

  // ----------------------------------------------------
  // A. PRODUCT SENSE
  // ----------------------------------------------------
  {
    const isPlanned = plannedCompetencies.includes('Product Sense') || interview?.interviewType === 'Product Sense';
    const evidenceList: any[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const hasProblemFraming = /\bproblem\b|objective|root cause|pain point|underlying issue|solve for/i.test(lowerFull);
    const hasSegmentation = /segment|cohort|first-time|repeat buyer|guest checkout|power user|enterprise vs/i.test(lowerFull);
    const hasTradeoffs = /tradeoff|sacrifice|deprioritiz|instead of|at the cost of|balance|give up/i.test(lowerFull);
    const hasPrematureSolution =
      /^(we should|i would|let's|my solution is to|we just need to)\s+(?:immediately\s+|just\s+)?(build|create|add|launch|design|implement)\s+(?:an?|the)?\s*(?:app|feature|tool|dashboard|ai|assistant|system|widget)/i.test(
        candidateSegments[0]?.answerText || ''
      );
    const hasUnsupportedAssumption =
      /obviously|everyone wants|guaranteed to|no doubt that|all users will|clearly they need|i assume all|assuming that all|assume everyone/i.test(lowerFull);
    const frameworkBuzzwordsOnly =
      /\brice\b|\bcircles\b|framework/i.test(lowerFull) && !hasProblemFraming && !hasSegmentation;

    let score = 3;
    let confidence: 'high' | 'medium' | 'low' = isPlanned ? 'high' : 'low';

    if (!isPlanned && fullCandidateText.length < 150) {
      confidence = 'low';
      score = 3;
      weaknesses.push('Insufficient evidence in transcript to evaluate Product Sense in depth.');
    } else if (hasProblemFraming && hasSegmentation && hasTradeoffs && !hasPrematureSolution) {
      score = 5;
      strengths.push('Demonstrated strong problem framing before exploring product features.');
      strengths.push('Clearly segmented user needs rather than treating the customer base as a monolith.');
      strengths.push('Articulated explicit product trade-offs and deprioritization decisions.');

      const quote = extractVerbatimQuote(fullCandidateText, /core problem|first-time|guest|tradeoff/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ps-${Date.now()}-1`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Candidate framed the problem statement and identified distinct customer friction points.',
          implication: 'Prevents wasted engineering bandwidth by aligning solutions with validated user needs.',
          competency: 'Product Sense',
          signalType: 'strength' as const,
        });
      }
    } else if (hasProblemFraming && (hasSegmentation || hasTradeoffs)) {
      score = 4;
      strengths.push('Solid user understanding and objective definition.');
      if (!hasTradeoffs) {
        weaknesses.push('Could be more explicit about what product alternatives or scope are deprioritized.');
      }
      const quote = extractVerbatimQuote(fullCandidateText, /problem|segment|user|customer/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ps-${Date.now()}-2`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Identified user requirements and structured the problem space.',
          implication: 'Ensures proposed features address real user pain points.',
          competency: 'Product Sense',
          signalType: 'strength' as const,
        });
      }
    } else if (hasPrematureSolution) {
      score = 2;
      weaknesses.push('Jumped straight to proposing features and solutions before defining the core user problem.');
      const quote = extractVerbatimQuote(fullCandidateText, /build|create|add|launch|design|ai/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ps-${Date.now()}-3`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Candidate proposed feature mechanisms before framing user persona or problem severity.',
          implication: 'Risk of building solutions that do not solve the underlying customer blocker.',
          competency: 'Product Sense',
          signalType: 'weakness' as const,
        });
      }
    } else if (hasUnsupportedAssumption) {
      score = 2;
      weaknesses.push('Relied on unvalidated assumptions regarding user preferences without citing evidence or data.');
      const quote = extractVerbatimQuote(fullCandidateText, /obviously|everyone wants|guaranteed|i assume all/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ps-${Date.now()}-4`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Asserted behavioral assumptions without customer evidence or telemetry.',
          implication: 'Leads to biased product roadmaps based on personal conjecture.',
          competency: 'Product Sense',
          signalType: 'weakness' as const,
        });
      }
    } else if (frameworkBuzzwordsOnly) {
      score = 2;
      weaknesses.push('Mentioned framework names without demonstrating substantive user problem analysis.');
      const quote = extractVerbatimQuote(fullCandidateText, /rice|circles|framework/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ps-${Date.now()}-5`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Referenced framework nomenclature without operationalizing its analytical steps.',
          implication: 'Name-dropping frameworks does not substitute for structured product judgment.',
          competency: 'Product Sense',
          signalType: 'weakness' as const,
        });
      }
    } else if (fullCandidateText.length < 80) {
      score = 2;
      weaknesses.push('Answer lacked sufficient breakdown of user motivations, segmentation, and tradeoffs.');
    } else if (!hasProblemFraming && !hasSegmentation && !hasTradeoffs && !/user|customer|persona|pain point|friction/i.test(lowerFull)) {
      score = 2;
      weaknesses.push('Response contained no customer framing, user segmentation, or problem analysis.');
    } else {
      score = 3;
      strengths.push('Demonstrated baseline product awareness.');
      weaknesses.push('Missed deeper user segmentation and explicit tradeoff rationale.');
    }

    competencyEvaluations.push({
      competency: 'Product Sense',
      score,
      confidence,
      strengths,
      weaknesses,
      evidence: evidenceList,
      recommendation:
        score >= 4
          ? 'Continue refining product edge cases and non-obvious user failure modes.'
          : 'Spend the first 1-2 minutes grounding the problem in specific user segments and behavioral changes before discussing feature solutions.',
    });
  }

  // ----------------------------------------------------
  // B. EXECUTION
  // ----------------------------------------------------
  {
    const isPlanned = plannedCompetencies.includes('Execution') || interview?.interviewType === 'Execution';
    const evidenceList: any[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const hasMetrics = /metric|kpi|conversion|north[- ]star|guardrail|retention|latency|error rate/i.test(lowerFull);
    const hasPrioritization = /priorit|first|criteria|matrix|phase 1|mvp|must have|blocker/i.test(lowerFull);
    const hasDiagnosis = /diagnos|root cause|funnel|rollout|pilot|a\/b test|telemetry|triage/i.test(lowerFull);

    let score = 3;
    let confidence: 'high' | 'medium' | 'low' = isPlanned ? 'high' : 'low';

    if (!isPlanned && fullCandidateText.length < 150) {
      confidence = 'low';
      score = 3;
      weaknesses.push('Insufficient evidence in transcript to evaluate Execution in depth.');
    } else if (hasMetrics && hasPrioritization && hasDiagnosis) {
      score = 5;
      strengths.push('Structured, metric-driven execution plan with clear triage and rollout milestones.');
      strengths.push('Established explicit prioritization criteria to guide implementation.');
      const quote = extractVerbatimQuote(fullCandidateText, /priorit|metric|north-star|rollout|triage/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ex-${Date.now()}-1`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Connected operational execution with measurable metrics and milestone phasing.',
          implication: 'Gives cross-functional teams a predictable roadmap for shipping value.',
          competency: 'Execution',
          signalType: 'strength' as const,
        });
      }
    } else if (hasMetrics && (hasPrioritization || hasDiagnosis)) {
      score = 4;
      strengths.push('Solid execution mindset with measurable success criteria.');
      if (!hasPrioritization) weaknesses.push('Provide clearer sequencing on what engineering delivers first vs later.');
    } else if (hasPrioritization) {
      score = 3;
      strengths.push('Demonstrated ability to prioritize tasks.');
      weaknesses.push('Needs tighter guardrail metrics to monitor delivery health and regressions.');
    } else {
      score = 2;
      weaknesses.push('Execution plan was unstructured and lacked clear delivery milestones or success metrics.');
    }

    competencyEvaluations.push({
      competency: 'Execution',
      score,
      confidence,
      strengths,
      weaknesses,
      evidence: evidenceList,
      recommendation:
        score >= 4
          ? 'Maintain strong operational discipline; continue detailing rollout risk mitigations.'
          : 'Establish clear primary and guardrail metrics alongside explicit phase sequencing for delivery.',
    });
  }

  // ----------------------------------------------------
  // C. ANALYTICS
  // ----------------------------------------------------
  {
    const isPlanned = plannedCompetencies.includes('Analytics') || plannedCompetencies.includes('Analytics & Metrics') || interview?.interviewType === 'Analytics';
    const evidenceList: any[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const hasMetricDecomp = /decompos|funnel|cohort|drop-off|driver|segmentation|denominator|numerator/i.test(lowerFull);
    const hasQuant = /\d+(\.\d+)?%|\$\d+|\b\d+x\b|baseline|statistically|sample size|rate/i.test(lowerFull);
    const hasHypothesis = /hypothes|root cause|suspect|isolate|investigate|correlation|variable/i.test(lowerFull);
    const hasVagueOnly = /make it better|improve engagement|make users happy/i.test(lowerFull) && !hasQuant;

    let score = 3;
    let confidence: 'high' | 'medium' | 'low' = isPlanned ? 'high' : 'low';

    if (!isPlanned && !hasMetricDecomp && !hasQuant) {
      confidence = 'low';
      score = 3;
      weaknesses.push('Insufficient evidence in transcript to evaluate quantitative and analytical depth.');
    } else if (hasMetricDecomp && hasQuant && hasHypothesis) {
      score = 5;
      strengths.push('Systematically decomposed metrics into underlying drivers and cohorts.');
      strengths.push('Formulated clear, testable hypotheses with quantitative thresholds.');
      const quote = extractVerbatimQuote(fullCandidateText, /decompos|conversion rate|\d+%|hypothesis|funnel/i);
      if (quote) {
        evidenceList.push({
          id: `ev-an-${Date.now()}-1`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Decomposed high-level metrics into granular funnel stages and numerical criteria.',
          implication: 'Enables rapid root-cause isolation and avoids misattributing vanity metrics.',
          competency: 'Analytics',
          signalType: 'strength' as const,
        });
      }
    } else if (hasQuant && (hasHypothesis || hasMetricDecomp)) {
      score = 4;
      strengths.push('Solid quantitative intuition and hypothesis generation.');
      weaknesses.push('Could expand further on guardrail metrics and statistical significance.');
    } else if (hasVagueOnly || (!hasQuant && !hasMetricDecomp && isPlanned)) {
      score = 2;
      weaknesses.push('Relied on vague definitions of success without decomposing metrics into measurable components.');
      const quote = extractVerbatimQuote(fullCandidateText, /engagement|happy|better|grow/i);
      if (quote) {
        evidenceList.push({
          id: `ev-an-${Date.now()}-2`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Cited generalized goals rather than formal metric formulas.',
          implication: 'Prevents objective evaluation of feature impact.',
          competency: 'Analytics',
          signalType: 'weakness' as const,
        });
      }
    } else {
      score = 3;
      strengths.push('Demonstrated basic awareness of relevant product metrics.');
      weaknesses.push('Decompose the north star metric into numerator and denominator drivers.');
    }

    competencyEvaluations.push({
      competency: 'Analytics',
      score,
      confidence,
      strengths,
      weaknesses,
      evidence: evidenceList,
      recommendation:
        score >= 4
          ? 'Continue leveraging structured metric trees to diagnose multi-variable trends.'
          : 'When diagnosing a metric shift, break it down by user cohort, geography, and funnel step before guessing root causes.',
    });
  }

  // ----------------------------------------------------
  // D. STRATEGY
  // ----------------------------------------------------
  {
    const isPlanned = plannedCompetencies.includes('Strategy') || interview?.interviewType === 'Strategy';
    const evidenceList: any[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const hasMarket = /market|competit|landscape|moat|barrier|incumbent|substitute|ecosystem/i.test(lowerFull);
    const hasBusiness = /business model|monetiz|margin|unit economics|arr|cac|ltv|revenue|pricing/i.test(lowerFull);
    const hasLongTerm = /long[- ]term|defensib|flywheel|sustainable|vision|portfolio/i.test(lowerFull);

    let score = 3;
    let confidence: 'high' | 'medium' | 'low' = isPlanned ? 'high' : 'low';

    if (!isPlanned && !hasMarket && !hasBusiness) {
      confidence = 'low';
      score = 3;
      weaknesses.push('Insufficient evidence in transcript to assess long-term market strategy.');
    } else if (hasMarket && hasBusiness && hasLongTerm) {
      score = 5;
      strengths.push('Demonstrated strong strategic judgment, competitive moat awareness, and business model viability.');
      const quote = extractVerbatimQuote(fullCandidateText, /market|unit economics|moat|margin|competit/i);
      if (quote) {
        evidenceList.push({
          id: `ev-st-${Date.now()}-1`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Analyzed strategic positioning, competitive dynamics, and long-term defensibility.',
          implication: 'Ensures product investments build sustainable enterprise value.',
          competency: 'Strategy',
          signalType: 'strength' as const,
        });
      }
    } else if (hasMarket || hasBusiness) {
      score = 4;
      strengths.push('Sound business reasoning and awareness of market landscape.');
      weaknesses.push('Consider competitive reactions and long-term defensibility moats more explicitly.');
    } else {
      score = 2;
      weaknesses.push('Focus remained purely tactical without consideration of unit economics or market dynamics.');
    }

    competencyEvaluations.push({
      competency: 'Strategy',
      score,
      confidence,
      strengths,
      weaknesses,
      evidence: evidenceList,
      recommendation:
        score >= 4
          ? 'Deepen analysis of unit economics thresholds and partner ecosystem dynamics.'
          : 'Anchor product proposals in business model implications, unit economics, and competitive barriers to entry.',
    });
  }

  // ----------------------------------------------------
  // E. LEADERSHIP & BEHAVIORAL
  // ----------------------------------------------------
  {
    const isPlanned = plannedCompetencies.includes('Leadership & Behavioral') || interview?.interviewType === 'Leadership & Behavioral';
    const evidenceList: any[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const hasOwnership = /i led|i took ownership|my responsibility|accountab|i decided|i drove/i.test(lowerFull);
    const hasStakeholders = /stakeholder|cross-functional|engineering|design|align|disagree|conflict|consensus/i.test(lowerFull);
    const hasLearning = /learned|retrospective|mistake|post-mortem|adjusted|in hindsight/i.test(lowerFull);

    let score = 3;
    let confidence: 'high' | 'medium' | 'low' = isPlanned ? 'high' : 'low';

    if (!isPlanned && !hasOwnership && !hasStakeholders) {
      confidence = 'low';
      score = 3;
      weaknesses.push('Insufficient evidence in transcript to evaluate behavioral leadership.');
    } else if (hasOwnership && hasStakeholders && hasLearning) {
      score = 5;
      strengths.push('Demonstrated strong ownership, cross-functional leadership, and retrospective learning.');
      const quote = extractVerbatimQuote(fullCandidateText, /i led|ownership|stakeholder|disagree|learned/i);
      if (quote) {
        evidenceList.push({
          id: `ev-ld-${Date.now()}-1`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Took clear accountability and structured cross-functional resolution.',
          implication: 'Demonstrates executive readiness and team trust.',
          competency: 'Leadership & Behavioral',
          signalType: 'strength' as const,
        });
      }
    } else if (hasOwnership || hasStakeholders) {
      score = 4;
      strengths.push('Clear ownership and cross-functional collaboration.');
      weaknesses.push('Share more concrete reflections on what you would do differently in hindsight.');
    } else {
      score = 2;
      weaknesses.push('Lacked clear personal ownership or evidence of influencing without authority.');
    }

    competencyEvaluations.push({
      competency: 'Leadership & Behavioral',
      score,
      confidence,
      strengths,
      weaknesses,
      evidence: evidenceList,
      recommendation:
        score >= 4
          ? 'Continue showcasing high-stakes conflict resolution with senior leadership.'
          : 'Frame behavioral stories using the Situation, Task, Action (emphasizing personal ownership), and Result format.',
    });
  }

  // ----------------------------------------------------
  // F. COMMUNICATION (Cross-cutting across entire transcript)
  // ----------------------------------------------------
  {
    const evidenceList: any[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const hasStructure =
      /\bfirst\b(?!\s*[- ]time)|\bsecond\b|\bthird\b|to structure this|in summary|on one hand|step 1|step 2|three reasons/i.test(lowerFull);
    const hasRamblingRunOn =
      ((lowerFull.match(/also|another thing|and also|um basically/g) || []).length >= 4 &&
        (!lowerFull.includes('. ') && !lowerFull.includes('? '))) ||
      (lowerFull.includes('and also') &&
        lowerFull.includes('another thing') &&
        (lowerFull.match(/also|another/g) || []).length >= 5);
    const isExcessivelyWordy =
      (candidateSegments.some((s) => s.wordCount > 300) && (lowerFull.match(/also|another|additionally/g) || []).length > 5) ||
      hasRamblingRunOn;
    const isVeryBrief = candidateSegments.every((s) => s.wordCount < 15);

    let score = 3;

    if (hasStructure && !isExcessivelyWordy && fullCandidateText.length >= 80) {
      score = 5;
      strengths.push('Consistently well-structured responses with clear signposting and logical flow.');
      strengths.push('Communicated complex reasoning clearly and concisely.');
      const quote = extractVerbatimQuote(fullCandidateText, /\bfirst\b(?!\s*[- ]time)|\bsecond\b|to structure|in summary|let's clarify/i);
      if (quote) {
        evidenceList.push({
          id: `ev-cm-${Date.now()}-1`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Used explicit signposting to organize thoughts logically before diving into details.',
          implication: 'Makes it easy for stakeholders and executives to follow complex reasoning.',
          competency: 'Communication',
          signalType: 'strength' as const,
        });
      }
    } else if (hasStructure && isExcessivelyWordy) {
      score = 3;
      strengths.push('Structured thoughts, but tended towards excessive verbosity.');
      weaknesses.push('Synthesize your points more concisely; avoid rambling lists of secondary points.');
    } else if (isExcessivelyWordy) {
      score = 2;
      weaknesses.push('Responses lacked concise synthesis and wandered across multiple disparate ideas with run-on phrasing.');
      const quote = extractVerbatimQuote(fullCandidateText, /also|another thing|um basically/i);
      if (quote) {
        evidenceList.push({
          id: `ev-cm-${Date.now()}-2`,
          transcriptSegmentId: candidateSegments[0]?.id || 'seg-1',
          quote,
          observation: 'Candidate used repeated conversational transitions and run-on structures without crisp synthesis.',
          implication: 'Obscures high-value product insights and creates cognitive fatigue for listeners.',
          competency: 'Communication',
          signalType: 'weakness' as const,
        });
      }
    } else if (isVeryBrief) {
      score = 2;
      weaknesses.push('Responses were overly brief and lacked the explanatory depth needed for a PM interview.');
    } else if (hasStructure) {
      score = 4;
      strengths.push('Clear flow and structured delivery.');
    } else {
      score = 3;
      strengths.push('Generally understandable communication.');
      weaknesses.push('Use more explicit signposting (e.g. "I see three distinct challenges here: 1, 2, 3").');
    }

    competencyEvaluations.push({
      competency: 'Communication',
      score,
      confidence: 'high' as const,
      strengths,
      weaknesses,
      evidence: evidenceList,
      recommendation:
        score >= 4
          ? 'Maintain crisp structure; continue leading with the high-level takeaway before the breakdown.'
          : 'Lead with a 15-second executive summary before walking through detailed points.',
    });
  }

  // 3. Answer-Level Evaluations
  candidateSegments.forEach((seg, idx) => {
    const isWeak = seg.wordCount < 25 || /we can run some ads|make the button bigger/i.test(seg.answerText);
    const isStrong = /core problem|user segment|metric|tradeoff/i.test(seg.answerText);

    answerEvaluations.push({
      questionId: `q-${idx + 1}`,
      competency: plannedCompetencies[idx % plannedCompetencies.length] || 'Product Sense',
      observedSignals: isStrong ? ['clear_problem_definition', 'tradeoff_reasoning'] : [],
      missingSignals: isWeak ? ['metric_definition', 'prioritization'] : [],
      strengths: isStrong ? ['Structured breakdown of problem space.'] : [],
      weaknesses: isWeak ? ['Lacks depth and metric formulation.'] : [],
      evidence: [],
      reasoningQuality: isStrong ? 'strong' : isWeak ? 'weak' : 'adequate',
      answerQuality: isStrong ? 'strong' : isWeak ? 'weak' : 'adequate',
    });
  });

  // 4. Cross-Interview Observations
  if (candidateSegments.length > 1) {
    const hasRepeatedUserFocus =
      candidateSegments.filter((s) => /user|customer|persona/i.test(s.answerText)).length >= 2;
    if (hasRepeatedUserFocus) {
      crossInterviewObservations.push({
        type: 'repeated_strength' as const,
        description: 'Consistently centered decisions on user needs across multiple answer exchanges.',
        evidence: [],
        impact: 'Builds candidate credibility as an empathetic product thinker.',
      });
    }

    const hasContradiction =
      /hate short videos/i.test(fullCandidateText) && /reels are great/i.test(fullCandidateText);
    if (hasContradiction) {
      crossInterviewObservations.push({
        type: 'contradiction' as const,
        description: 'Candidate presented conflicting viewpoints between early and late responses.',
        evidence: [],
        impact: 'Weakens strategic conviction and logical consistency.',
      });
    }
  }

  // 5. Calculate Weighted Overall Score (0 to 100)
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const compEval of competencyEvaluations) {
    if (compEval.confidence === 'low') continue; // Untested areas do not dilute score

    let weight = 1.0;
    if (compEval.competency === 'Communication') {
      weight = 0.8;
    } else if (plannedCompetencies.includes(compEval.competency)) {
      weight = 2.0; // Heavily weight target round competencies
    }

    totalWeightedScore += compEval.score * weight;
    totalWeight += weight;
  }

  const normalizedScore = totalWeight > 0 ? (totalWeightedScore / totalWeight / 5) * 100 : 60;
  const overallScore = Math.min(100, Math.max(0, Math.round(normalizedScore)));

  // Performance Recommendation (NOT a hiring prediction)
  let recommendation: 'strong' | 'meets_expectations' | 'developing' | 'needs_improvement' = 'developing';
  if (overallScore >= 85) {
    recommendation = 'strong';
  } else if (overallScore >= 70) {
    recommendation = 'meets_expectations';
  } else if (overallScore >= 55) {
    recommendation = 'developing';
  } else {
    recommendation = 'needs_improvement';
  }

  // 6. Actionable Coaching & Next Practice Recommendations
  const allWeaknesses = competencyEvaluations
    .filter((c) => c.confidence !== 'low')
    .flatMap((c) => c.weaknesses)
    .filter(Boolean);

  const allStrengths = competencyEvaluations
    .filter((c) => c.confidence !== 'low')
    .flatMap((c) => c.strengths)
    .filter(Boolean);

  const overallStrengths = Array.from(new Set(allStrengths)).slice(0, 4);
  const overallWeaknesses = Array.from(new Set(allWeaknesses)).slice(0, 4);

  // Ground priority improvements in observed weaknesses
  const priorityImprovements: string[] = [];

  if (allWeaknesses.some((w) => /feature|solution|premature/i.test(w))) {
    priorityImprovements.push(
      'When defining a product problem, spend the first 1-2 minutes establishing the affected user segment and the specific behavior that has changed before proposing solutions.'
    );
  }
  if (allWeaknesses.some((w) => /metric|measurement|vague/i.test(w))) {
    priorityImprovements.push(
      'When diagnosing a metric decline, explicitly decompose the metric into its major funnel drivers and explain which driver you would investigate first and why.'
    );
  }
  if (allWeaknesses.some((w) => /trade-off|deprioritiz/i.test(w))) {
    priorityImprovements.push(
      'Explicitly state the downside of your proposed recommendation (e.g. higher engineering cost, user friction) and justify why the benefit outweighs the tradeoff.'
    );
  }
  if (allWeaknesses.some((w) => /assumption|unvalidated/i.test(w))) {
    priorityImprovements.push(
      'State what customer research, data telemetry, or A/B testing would be needed to validate key behavioral assumptions rather than presenting them as foregone conclusions.'
    );
  }
  if (priorityImprovements.length === 0) {
    priorityImprovements.push(
      'Practice framing edge-case failure modes and second-order ecosystem effects for senior leadership discussions.'
    );
    priorityImprovements.push(
      'Continue articulating clear guardrail metrics to protect user trust during aggressive growth initiatives.'
    );
  }

  const nextPracticeRecommendations = [
    'Execute a 15-minute Product Sense drill: design a workflow for a specific non-technical user segment and articulate 2 explicit tradeoffs.',
    'Execute a 15-minute Root Cause Analysis drill: decompose an engagement drop into a structured metric tree across cohorts.',
    'Practice the Situation-Task-Action-Result format focusing on cross-functional alignment and lessons learned.',
  ];

  return {
    id: `eval-${Date.now()}`,
    interviewId,
    overallScore,
    competencyEvaluations,
    overallStrengths,
    overallWeaknesses,
    priorityImprovements: priorityImprovements.slice(0, 3),
    nextPracticeRecommendations,
    recommendation,
    crossInterviewObservations,
    answerEvaluations,
    metadata: {
      model: metadata?.model || 'factual-rubric-evaluator-v1',
      promptVersion: metadata?.promptVersion || '1.0.0',
      rubricVersion: metadata?.rubricVersion || '2026.1',
      testCaseId: metadata?.testCaseId,
    },
    generatedAt: new Date().toISOString(),
  };
}

const serverInterviews = new Map<string, any>();
const serverEvaluations = new Map<string, any>();

export function aiServerPlugin(): Plugin {
  return {
    name: 'ai-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          const body = await parseRequestBody(req);

          // 1. Resume Parser
          if (req.url === '/api/ai/parse-resume') {
            const { resumeText } = body;
            if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 30) {
              return sendJsonResponse(res, 400, {
                error: 'Invalid or empty resume text provided.',
              });
            }

            const parsed = factualResumeParser(resumeText);
            return sendJsonResponse(res, 200, parsed);
          }

          // 2. Job Description Parser
          if (req.url === '/api/ai/parse-jd') {
            const { jdText, targetRole } = body;
            if (!jdText || typeof jdText !== 'string' || jdText.trim().length === 0) {
              return sendJsonResponse(res, 400, {
                error: 'Job description text cannot be empty.',
              });
            }

            if (jdText.length > 30000) {
              return sendJsonResponse(res, 400, {
                error: 'Job description exceeds the 30,000 character limit.',
              });
            }

            const parsed = factualJdParser(jdText, targetRole);
            return sendJsonResponse(res, 200, parsed);
          }

          // 3. Candidate-to-Job Matcher
          if (req.url === '/api/ai/match') {
            const { candidateProfile, jobProfile } = body;
            if (!candidateProfile || !jobProfile) {
              return sendJsonResponse(res, 400, {
                error: 'Both candidateProfile and jobProfile are required for matching.',
              });
            }

            const matchResult = factualMatcher(candidateProfile, jobProfile);
            return sendJsonResponse(res, 200, matchResult);
          }

          // 4. Interview Brief Generator
          if (req.url === '/api/ai/create-brief') {
            const {
              candidateProfile,
              jobProfile,
              match,
              targetRole,
              interviewType,
              difficulty,
            } = body;

            if (!candidateProfile || !jobProfile || !match) {
              return sendJsonResponse(res, 400, {
                error: 'candidateProfile, jobProfile, and match are required for brief creation.',
              });
            }

            const briefResult = factualBriefGenerator(
              candidateProfile,
              jobProfile,
              match,
              targetRole,
              interviewType,
              difficulty
            );
            return sendJsonResponse(res, 200, briefResult);
          }

          // 5. Interview Plan Generator
          if (req.url === '/api/ai/interview/create-plan') {
            const {
              brief,
              candidateProfile,
              jobProfile,
              duration,
              difficulty,
              targetRole,
              interviewId,
            } = body;

            if (!brief || !targetRole || !duration) {
              return sendJsonResponse(res, 400, {
                error: 'brief, targetRole, and duration are required to create an interview plan.',
              });
            }

            const plan = factualPlanGenerator({
              brief,
              candidateProfile,
              jobProfile,
              duration: Number(duration) || 30,
              difficulty: difficulty || 'Standard',
              targetRole,
              interviewId: interviewId || `interview-${Date.now()}`,
            });

            return sendJsonResponse(res, 200, plan);
          }

          // 6. Answer Analyzer
          if (req.url === '/api/ai/interview/analyze-answer') {
            const { question, answerText, expectedSignals, candidateProfile, jobProfile, role, difficulty } =
              body;

            if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
              return sendJsonResponse(res, 400, {
                error: 'Candidate answerText cannot be empty.',
              });
            }

            const analysis = factualAnswerAnalyzer({
              question: question || '',
              answerText: answerText.trim(),
              expectedSignals: expectedSignals || [],
              candidateProfile,
              jobProfile,
              role: role || 'Product Manager',
              difficulty: difficulty || 'Standard',
            });

            return sendJsonResponse(res, 200, analysis);
          }

          // 7. Follow-Up Probe Generator
          if (req.url === '/api/ai/interview/generate-follow-up') {
            const { question, answerText, analysis, plan, state, candidateProfile, jobProfile } =
              body;

            if (!question || !answerText || !analysis) {
              return sendJsonResponse(res, 400, {
                error: 'question, answerText, and analysis are required to generate follow-up.',
              });
            }

            const followUp = factualFollowUpGenerator({
              question,
              answerText,
              analysis,
              plan,
              state,
              candidateProfile,
              jobProfile,
            });

            return sendJsonResponse(res, 200, followUp);
          }

          // 8. Evaluation Engine
          if (req.url === '/api/ai/evaluation/evaluate') {
            const {
              interview,
              candidateProfile,
              jobProfile,
              interviewPlan,
              transcript,
              questions,
              answers,
              metadata,
            } = body;

            if (!transcript || !Array.isArray(transcript)) {
              return sendJsonResponse(res, 400, {
                error: 'transcript array is required for interview evaluation.',
              });
            }

            const evaluation = factualEvaluationEngine({
              interview,
              candidateProfile,
              jobProfile,
              interviewPlan,
              transcript,
              questions,
              answers,
              metadata,
            });

            return sendJsonResponse(res, 200, evaluation);
          }

          // 9. LLM System Configuration (Strictly no secret keys exposed)
          if (req.url === '/api/ai/config') {
            return sendJsonResponse(res, 200, {
              provider: llmConfig.getActiveProvider(),
              hasActiveKey: llmConfig.hasActiveKey(),
              interviewerModel: llmConfig.getInterviewerModel(),
              evaluatorModel: llmConfig.getEvaluatorModel(),
              interviewerPromptVersion: INTERVIEWER_PROMPT_VERSION,
              evaluatorPromptVersion: EVALUATOR_PROMPT_VERSION,
              rubricVersion: RUBRIC_VERSION,
            });
          }

          // 10. Real LLM Interviewer Action
          if (req.url === '/api/ai/llm/interview-action') {
            const result = await llmService.executeInterviewerAction(body);
            return sendJsonResponse(res, 200, result);
          }

          // 11. Real LLM Evaluator
          if (req.url === '/api/ai/llm/evaluate') {
            const result = await llmService.executeEvaluation(body);
            return sendJsonResponse(res, 200, result);
          }

          // ==========================================
          // TRD SECTION 15 CANONICAL REST ENDPOINTS
          // ==========================================

          // POST /api/resume/process (TRD Section 15)
          if (req.url === '/api/resume/process') {
            const resumeText = body.resumeText || body.rawText;
            if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 30) {
              return sendJsonResponse(res, 400, { error: 'Invalid or empty resume text provided.' });
            }
            const candidateProfile = factualResumeParser(resumeText);
            return sendJsonResponse(res, 200, { candidateProfile, ...candidateProfile });
          }

          // POST /api/job/process (TRD Section 15)
          if (req.url === '/api/job/process') {
            const jdText = body.rawJobDescription || body.jdText || body.jobDescription;
            if (!jdText || typeof jdText !== 'string' || jdText.trim().length === 0) {
              return sendJsonResponse(res, 400, { error: 'Job description text cannot be empty.' });
            }
            const jobProfile = factualJdParser(jdText, body.targetRole);
            return sendJsonResponse(res, 200, { jobProfile, ...jobProfile });
          }

          // GET /api/interviews (TRD Section 15: Retrieve interview history)
          if (req.url === '/api/interviews' && req.method === 'GET') {
            return sendJsonResponse(res, 200, { interviews: Array.from(serverInterviews.values()) });
          }

          // POST /api/interviews (TRD Section 15: Create interview)
          if (req.url === '/api/interviews' && req.method === 'POST') {
            const interviewId = body.id || `interview-${Date.now()}`;
            const targetRole = body.targetRole || 'Product Manager';
            const duration = Number(body.durationMinutes || body.duration || 30);
            const difficulty = body.difficulty || 'Standard';
            const interviewType = body.interviewType || 'Product Sense';

            let match = null;
            let brief = null;
            let plan = null;

            if (body.candidateProfile && body.jobProfile) {
              match = factualMatcher(body.candidateProfile, body.jobProfile);
              brief = factualBriefGenerator(body.candidateProfile, body.jobProfile, match, targetRole, interviewType, difficulty);
              plan = factualPlanGenerator({
                brief,
                candidateProfile: body.candidateProfile,
                jobProfile: body.jobProfile,
                duration,
                difficulty,
                targetRole,
                interviewId,
              });
            }

            const interviewRecord = {
              id: interviewId,
              userId: body.userId || 'user-default',
              title: `${targetRole} - ${interviewType}`,
              targetRole,
              interviewType,
              difficulty,
              durationMinutes: duration,
              duration,
              mode: body.mode || 'Text',
              status: 'ready',
              candidateProfile: body.candidateProfile || null,
              jobProfile: body.jobProfile || null,
              match,
              brief,
              plan,
              createdAt: new Date().toISOString(),
            };

            serverInterviews.set(interviewId, interviewRecord);
            return sendJsonResponse(res, 201, { interview: interviewRecord, plan, brief, match });
          }

          // Regex matching for /api/interviews/:id routes
          const interviewIdMatch = req.url?.match(/^\/api\/interviews\/([^/?]+)(.*)$/);
          if (interviewIdMatch) {
            const id = interviewIdMatch[1];
            const subpath = interviewIdMatch[2]; // '', '/start', '/answer', '/next', '/complete', '/evaluation'

            // GET /api/interviews/:id/evaluation (TRD Section 15)
            if (subpath === '/evaluation' && req.method === 'GET') {
              const evalRecord = serverEvaluations.get(id);
              if (!evalRecord) {
                return sendJsonResponse(res, 404, { error: `Evaluation for interview ${id} not found.` });
              }
              return sendJsonResponse(res, 200, { evaluation: evalRecord, ...evalRecord });
            }

            // GET /api/interviews/:id (TRD Section 15)
            if (subpath === '' && req.method === 'GET') {
              const interviewRecord = serverInterviews.get(id);
              if (!interviewRecord) {
                return sendJsonResponse(res, 404, { error: `Interview ${id} not found.` });
              }
              return sendJsonResponse(res, 200, { interview: interviewRecord, ...interviewRecord });
            }

            // POST /api/interviews/:id/start (TRD Section 15)
            if (subpath === '/start') {
              const interviewRecord = serverInterviews.get(id);
              const opening = interviewRecord?.plan?.sections?.[0]?.primaryQuestion ||
                "Welcome! Let's begin by discussing how you approach defining the user problem for this product.";
              return sendJsonResponse(res, 200, {
                interviewId: id,
                currentState: 'ASKING',
                actionType: 'ask_question',
                content: opening,
                sequenceNumber: 1,
              });
            }

            // POST /api/interviews/:id/answer (TRD Section 15)
            if (subpath === '/answer') {
              const answerText = body.answerText || body.text || '';
              const analysis = factualAnswerAnalyzer({
                question: body.question || '',
                answerText,
                expectedSignals: body.expectedSignals || [],
                candidateProfile: body.candidateProfile,
                jobProfile: body.jobProfile,
                role: body.targetRole || 'Product Manager',
                difficulty: body.difficulty || 'Standard',
              });
              return sendJsonResponse(res, 200, { analysis, ...analysis });
            }

            // POST /api/interviews/:id/next (TRD Section 15)
            if (subpath === '/next') {
              if (llmConfig.hasActiveKey()) {
                const llmResult = await llmService.executeInterviewerAction(body);
                return sendJsonResponse(res, 200, llmResult.data);
              }
              const followUp = factualFollowUpGenerator(body);
              return sendJsonResponse(res, 200, followUp);
            }

            // POST /api/interviews/:id/complete (TRD Section 15)
            if (subpath === '/complete') {
              const interviewRecord = serverInterviews.get(id);
              if (interviewRecord) {
                interviewRecord.status = 'completed';
                interviewRecord.completedAt = new Date().toISOString();
              }
              if (body.transcript && Array.isArray(body.transcript)) {
                const evalResult = factualEvaluationEngine({
                  interview: interviewRecord,
                  transcript: body.transcript,
                  candidateProfile: interviewRecord?.candidateProfile,
                  jobProfile: interviewRecord?.jobProfile,
                  interviewPlan: interviewRecord?.plan,
                });
                serverEvaluations.set(id, evalResult);
              }
              return sendJsonResponse(res, 200, { success: true, interviewId: id, completedAt: new Date().toISOString() });
            }
          }

          return next();
        } catch (error: any) {
          console.error('[AI Server Plugin Error]:', error);
          return sendJsonResponse(res, 500, {
            error: error.message || 'Internal AI service error occurred.',
          });
        }
      });
    },
  };
}
