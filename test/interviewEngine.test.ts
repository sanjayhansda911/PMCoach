/**
 * Automated Test Suite for PM Interview Coach Live Adaptive Interviewer
 * Validates all 12 core scenarios:
 * 1. Strong structured answer -> signals detected, constraint/tradeoff check
 * 2. Weak/incomplete answer -> missing signals detected, probe requested
 * 3. Premature solution -> redirected to problem & persona
 * 4. Missing metric -> probe requested for success metrics
 * 5. Unsupported assumption -> challenged with evidence request
 * 6. Strong answer with explicit tradeoffs -> tradeoff_reasoning detected
 * 7. Candidate resume claim probe -> grounded in documented claim
 * 8. Candidate resume attribution check -> isolated impact inquiry
 * 9. Brief answer -> shallow_reasoning, clarification requested
 * 10. Rambling answer -> excessive_breadth, prioritization requested
 * 11. Time running low -> moves forward or concludes without deep probe
 * 12. Refresh / persistence restoration -> resume exact state and exchanges
 */

import {
  factualPlanGenerator,
  factualAnswerAnalyzer,
  factualFollowUpGenerator,
} from '../server/aiServerPlugin.ts';

// Setup Mock In-Memory localStorage
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, v),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  length: 0,
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

// Setup Mock Fetch to route relative URLs to local server or in-memory handlers
(globalThis as any).fetch = async (url: string, init?: any) => {
  if (url.startsWith('/api/ai/')) {
    const body = init?.body ? JSON.parse(init.body) : {};

    if (url === '/api/ai/interview/create-plan') {
      const plan = factualPlanGenerator({
        brief: body.brief,
        candidateProfile: body.candidateProfile,
        jobProfile: body.jobProfile,
        duration: Number(body.duration) || 30,
        difficulty: body.difficulty || 'Standard',
        targetRole: body.targetRole || 'Product Manager',
        interviewId: body.interviewId || `test-${Date.now()}`,
      });
      return {
        ok: true,
        json: async () => plan,
      };
    }

    if (url === '/api/ai/interview/analyze-answer') {
      const analysis = factualAnswerAnalyzer({
        question: body.question,
        answerText: body.answerText,
        expectedSignals: body.expectedSignals || [],
        candidateProfile: body.candidateProfile,
        jobProfile: body.jobProfile,
        role: body.role || 'Product Manager',
        difficulty: body.difficulty || 'Standard',
      });
      return {
        ok: true,
        json: async () => analysis,
      };
    }

    if (url === '/api/ai/interview/generate-follow-up') {
      const followUp = factualFollowUpGenerator({
        question: body.question,
        answerText: body.answerText,
        analysis: body.analysis,
        plan: body.plan,
        state: body.state,
        candidateProfile: body.candidateProfile,
        jobProfile: body.jobProfile,
      });
      return {
        ok: true,
        json: async () => followUp,
      };
    }
  }

  throw new Error(`Unhandled mock fetch URL: ${url}`);
};

// Import services after mocks are ready
import { interviewEngine } from '../src/services/interviewEngine.ts';
import { interviewStorage } from '../src/storage/interviewStorage.ts';
import { interviewService } from '../src/services/interviewService.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runAllScenarios() {
  console.log('\n======================================================');
  console.log('Running PM Interview Coach Live Interviewer Test Suite');
  console.log('======================================================\n');

  // Common Test Fixtures
  const testCandidateProfile = {
    id: 'cand-test-1',
    userId: 'user-1',
    resumeFileName: 'test_resume.pdf',
    resumeFileSize: 1024,
    resumeText: 'Sarah Connor, Senior Product Manager at Stripe. Grew payment checkout conversion by 14%.',
    candidateName: 'Sarah Connor',
    currentRole: 'Senior Product Manager',
    yearsOfExperience: 7,
    previousRoles: ['Product Manager', 'Senior Product Manager'],
    companies: ['Stripe', 'Square'],
    products: ['Checkout', 'Billing'],
    industries: ['FinTech', 'SaaS'],
    skills: ['A/B Testing', 'Product Strategy', 'SQL', 'Roadmapping'],
    achievements: ['Led checkout redesign boosting conversion by 14%'],
    metricsAndImpact: ['Boosted conversion by 14% across 2M active checkout sessions'],
    leadershipExamples: ['Managed cross-functional team of 12 engineers and designers'],
    productExamples: ['Stripe 1-Click Mobile Checkout'],
    notableProjects: ['Global Checkout Redesign'],
    experiences: [],
    createdAt: new Date().toISOString(),
  };

  const testJobProfile = {
    id: 'job-test-1',
    rawText: 'Senior Product Manager for Payments and Consumer Checkout at Shopify.',
    company: 'Shopify',
    role: 'Senior Product Manager',
    seniority: 'Senior Product Manager' as const,
    responsibilities: ['Own end-to-end checkout flow', 'Drive conversion and reduce friction'],
    requiredSkills: ['A/B Testing', 'Product Strategy', 'Data Telemetry'],
    preferredSkills: ['FinTech', 'Mobile Checkout'],
    productArea: 'Checkout',
    domain: 'Payments & E-Commerce',
    likelyInterviewCompetencies: ['Product Sense', 'Execution', 'Analytics & Metrics'] as any,
    experienceRequirements: ['5+ years PM experience'],
    importantKeywords: ['Payments', 'Checkout', 'Mobile'],
    successSignals: ['Articulates user problem first', 'Strong metric definition'],
    createdAt: new Date().toISOString(),
  };

  const testBrief = {
    id: 'brief-test-1',
    interviewId: 'interview-test-1',
    candidateProfileId: testCandidateProfile.id,
    jobProfileId: testJobProfile.id,
    recommendedDifficulty: 'Challenging' as const,
    recommendedDuration: 30 as const,
    competenciesToTest: ['Product Sense', 'Execution', 'Analytics & Metrics'] as any,
    tailoredFocusReason: 'Senior PM with extensive payment checkout experience applying for Shopify payments.',
    recommendedQuestionThemes: ['Mobile Checkout Friction', 'Payment Gateway Failover'],
    resumeClaimsWorthInvestigating: [
      {
        claim: 'Boosted conversion by 14% across 2M active checkout sessions',
        context: 'Stripe Checkout',
        probeReason: 'Investigate attribution and experimental rigor',
      },
    ],
    potentialGapsToProbe: [],
    createdAt: new Date().toISOString(),
  };

  const testInterview = {
    id: 'interview-test-1',
    userId: 'user-1',
    candidateProfileId: testCandidateProfile.id,
    jobProfileId: testJobProfile.id,
    targetRole: 'Senior Product Manager' as const,
    interviewType: 'Product Sense' as const,
    difficulty: 'Challenging' as const,
    duration: 30 as const,
    mode: 'Text' as const,
    status: 'ready' as const,
    createdAt: new Date().toISOString(),
  };

  // Seed storage
  interviewStorage.saveCandidateProfile(testCandidateProfile as any);
  interviewStorage.saveJobProfile(testJobProfile as any);
  interviewStorage.saveInterviewBrief(testBrief as any);
  interviewStorage.saveInterview(testInterview as any);

  // ----------------------------------------------------
  // SCENARIO 1: Candidate gives a strong, structured answer
  // ----------------------------------------------------
  console.log('--- Scenario 1: Strong, Structured Answer ---');
  const strongAnswerText =
    "Let's clarify the core problem first. In Payments & E-Commerce, first-time mobile shoppers abandon cart due to hidden shipping fees and lengthy signup forms. " +
    "I would segment our users into guest checkout shoppers versus logged-in repeat buyers. For the guest segment, I prioritize a 1-click checkout option. " +
    "For our north-star metric, we should measure mobile checkout completion rate, with guardrails on fraud rates. " +
    "The central tradeoff here is fraud friction versus conversion velocity.";

  const strongAnalysis = factualAnswerAnalyzer({
    question: "Design an improved checkout experience for mobile shoppers.",
    answerText: strongAnswerText,
    expectedSignals: ['clear_problem_definition', 'user_identification', 'prioritization', 'metric_definition'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Senior Product Manager',
    difficulty: 'Challenging',
  });

  assert(
    strongAnalysis.detectedSignals.includes('clear_problem_definition'),
    'Scenario 1: Detected clear_problem_definition'
  );
  assert(
    strongAnalysis.detectedSignals.includes('user_identification'),
    'Scenario 1: Detected user_identification'
  );
  assert(
    strongAnalysis.detectedSignals.includes('prioritization'),
    'Scenario 1: Detected prioritization'
  );
  assert(
    strongAnalysis.detectedSignals.includes('metric_definition'),
    'Scenario 1: Detected metric_definition'
  );
  assert(
    strongAnalysis.detectedSignals.includes('tradeoff_reasoning'),
    'Scenario 1: Detected tradeoff_reasoning'
  );
  assert(
    !strongAnalysis.potentialIssues.includes('premature_solution'),
    'Scenario 1: No premature_solution issue'
  );
  assert(
    !strongAnalysis.potentialIssues.includes('missing_metric'),
    'Scenario 1: No missing_metric issue'
  );

  // ----------------------------------------------------
  // SCENARIO 2: Weak / Incomplete Answer
  // ----------------------------------------------------
  console.log('\n--- Scenario 2: Weak / Incomplete Answer ---');
  const weakAnswerText = "We can run some ads and make the button bigger.";
  const weakAnalysis = factualAnswerAnalyzer({
    question: "How would you improve checkout conversion?",
    answerText: weakAnswerText,
    expectedSignals: ['clear_problem_definition', 'metric_definition'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Senior Product Manager',
    difficulty: 'Challenging',
  });

  assert(weakAnalysis.probeRecommended === true, 'Scenario 2: Probe recommended for weak answer');
  assert(
    weakAnalysis.potentialIssues.includes('shallow_reasoning') ||
      weakAnalysis.potentialIssues.includes('missing_metric'),
    'Scenario 2: Identified shallow reasoning or missing metrics'
  );

  // ----------------------------------------------------
  // SCENARIO 3: Premature Solution
  // ----------------------------------------------------
  console.log('\n--- Scenario 3: Premature Solution ---');
  const prematureSolutionAnswer =
    "We should immediately build an AI assistant with voice recognition and 3D animations that talks to the shopper during checkout.";
  const prematureAnalysis = factualAnswerAnalyzer({
    question: "How would you improve mobile checkout?",
    answerText: prematureSolutionAnswer,
    expectedSignals: ['clear_problem_definition', 'user_identification'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Senior Product Manager',
    difficulty: 'Standard',
  });

  assert(
    prematureAnalysis.potentialIssues.includes('premature_solution'),
    'Scenario 3: Detected premature_solution issue'
  );

  const prematureFollowUp = factualFollowUpGenerator({
    question: "How would you improve mobile checkout?",
    answerText: prematureSolutionAnswer,
    analysis: prematureAnalysis,
    plan: { jobProfile: testJobProfile },
    state: {},
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
  });

  assert(
    prematureFollowUp.followUpQuestion.toLowerCase().includes('problem') &&
      prematureFollowUp.followUpQuestion.toLowerCase().includes('user'),
    'Scenario 3: Follow-up redirects candidate to define problem and user persona first'
  );

  // ----------------------------------------------------
  // SCENARIO 4: Missing Metric
  // ----------------------------------------------------
  console.log('\n--- Scenario 4: Missing Metric ---');
  const missingMetricAnswer =
    "I would solve this by understanding our customers. The core problem is that shoppers abandon cart because they cannot calculate shipping. I prioritize an upfront shipping calculator in the cart drawer.";
  const missingMetricAnalysis = factualAnswerAnalyzer({
    question: "How would you address cart abandonment?",
    answerText: missingMetricAnswer,
    expectedSignals: ['clear_problem_definition', 'metric_definition'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Product Manager',
    difficulty: 'Standard',
  });

  assert(
    missingMetricAnalysis.potentialIssues.includes('missing_metric'),
    'Scenario 4: Detected missing_metric'
  );

  const missingMetricFollowUp = factualFollowUpGenerator({
    question: "How would you address cart abandonment?",
    answerText: missingMetricAnswer,
    analysis: missingMetricAnalysis,
    plan: { jobProfile: testJobProfile },
    state: {},
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
  });

  assert(
    missingMetricFollowUp.followUpQuestion.toLowerCase().includes('metric'),
    'Scenario 4: Follow-up inquires about specific success metric'
  );

  // ----------------------------------------------------
  // SCENARIO 5: Unsupported Assumption
  // ----------------------------------------------------
  console.log('\n--- Scenario 5: Unsupported Assumption ---');
  const unsupportedAssumptionAnswer =
    "I assume all buyers always want to use cryptocurrency and nobody uses debit cards anymore, so we should disable credit card processing.";
  const assumptionAnalysis = factualAnswerAnalyzer({
    question: "What payment methods should we support?",
    answerText: unsupportedAssumptionAnswer,
    expectedSignals: ['clear_problem_definition'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Product Manager',
    difficulty: 'Standard',
  });

  assert(
    assumptionAnalysis.potentialIssues.includes('unsupported_assumption'),
    'Scenario 5: Detected unsupported_assumption'
  );

  const assumptionFollowUp = factualFollowUpGenerator({
    question: "What payment methods should we support?",
    answerText: unsupportedAssumptionAnswer,
    analysis: assumptionAnalysis,
    plan: { jobProfile: testJobProfile },
    state: {},
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
  });

  assert(
    assumptionFollowUp.actionType === 'challenge_assumption',
    'Scenario 5: Action type is challenge_assumption'
  );

  // ----------------------------------------------------
  // SCENARIO 6: Strong Answer with Explicit Tradeoffs
  // ----------------------------------------------------
  console.log('\n--- Scenario 6: Strong Answer with Explicit Tradeoffs ---');
  const tradeoffAnswer =
    "The core tradeoff in checkout optimization is speed versus data collection. Requiring postal code validation reduces card-not-present fraud by 40%, but increases friction by 2 additional form fields. I prioritize fraud protection for orders over $200 while giving low-risk orders zero-friction 1-click checkout.";
  const tradeoffAnalysis = factualAnswerAnalyzer({
    question: "How do you balance fraud vs user friction in checkout?",
    answerText: tradeoffAnswer,
    expectedSignals: ['tradeoff_reasoning', 'business_reasoning'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Senior Product Manager',
    difficulty: 'Standard',
  });

  assert(
    tradeoffAnalysis.detectedSignals.includes('tradeoff_reasoning'),
    'Scenario 6: Detected tradeoff_reasoning'
  );
  assert(
    !tradeoffAnalysis.potentialIssues.includes('no_tradeoff'),
    'Scenario 6: Correctly recognized tradeoff was addressed'
  );

  // ----------------------------------------------------
  // SCENARIO 7 & 8: Resume Claim Probing & Attribution
  // ----------------------------------------------------
  console.log('\n--- Scenarios 7 & 8: Resume Claim Probe & Attribution ---');
  const resumeProbeFollowUp = factualFollowUpGenerator({
    question: "Walk me through your checkout experience.",
    answerText: "I led checkout at my previous company and achieved strong results.",
    analysis: { potentialIssues: [] }, // No basic issues, trigger claim probe
    plan: { jobProfile: testJobProfile },
    state: { claimsDiscussed: [] },
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
  });

  assert(
    resumeProbeFollowUp.followUpQuestion.includes('Boosted conversion by 14%'),
    'Scenario 7: Follow-up explicitly anchors in documented resume claim'
  );
  assert(
    resumeProbeFollowUp.targetSignal === 'quantified_impact' &&
      resumeProbeFollowUp.probeReason.includes('attribution'),
    'Scenario 8: Follow-up challenges attribution and isolation of candidate impact'
  );

  // ----------------------------------------------------
  // SCENARIO 9: Shallow / Very Brief Answer
  // ----------------------------------------------------
  console.log('\n--- Scenario 9: Shallow Answer ---');
  const briefAnswer = "Yes, totally agree.";
  const briefAnalysis = factualAnswerAnalyzer({
    question: "How would you structure your product roadmap?",
    answerText: briefAnswer,
    expectedSignals: ['structured_communication'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Product Manager',
    difficulty: 'Standard',
  });

  assert(
    briefAnalysis.potentialIssues.includes('shallow_reasoning'),
    'Scenario 9: Detected shallow_reasoning on brief response'
  );
  assert(
    briefAnalysis.suggestedProbeType === 'request_clarification',
    'Scenario 9: Suggested probe type is request_clarification'
  );

  // ----------------------------------------------------
  // SCENARIO 10: Rambling / Excessive Breadth
  // ----------------------------------------------------
  console.log('\n--- Scenario 10: Excessive Breadth / Rambling ---');
  const ramblingAnswer =
    "We could build feature A, also feature B, another idea is feature C, additionally feature D, plus feature E, another thing is feature F, we might also consider feature G, also feature H, plus feature I, and feature J.";
  const ramblingAnalysis = factualAnswerAnalyzer({
    question: "What should we build next?",
    answerText: ramblingAnswer,
    expectedSignals: ['prioritization'],
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
    role: 'Product Manager',
    difficulty: 'Standard',
  });

  assert(
    ramblingAnalysis.potentialIssues.includes('excessive_breadth'),
    'Scenario 10: Detected excessive_breadth'
  );

  const ramblingFollowUp = factualFollowUpGenerator({
    question: "What should we build next?",
    answerText: ramblingAnswer,
    analysis: ramblingAnalysis,
    plan: { jobProfile: testJobProfile },
    state: {},
    candidateProfile: testCandidateProfile,
    jobProfile: testJobProfile,
  });

  assert(
    ramblingFollowUp.probeReason.includes('prioritization'),
    'Scenario 10: Follow-up requests candidate commit to single priority'
  );

  // ----------------------------------------------------
  // SCENARIO 11: Time Running Low - Section Transition & Conclude
  // ----------------------------------------------------
  console.log('\n--- Scenario 11: Time Running Low Flow ---');
  const startResult = await interviewEngine.startInterview(testInterview.id);
  assert(
    startResult.state.currentStage === 'ASKING',
    'Scenario 11: Interview starts in ASKING stage'
  );
  assert(
    startResult.exchanges.length === 1 && startResult.exchanges[0].role === 'interviewer',
    'Scenario 11: First exchange is interviewer opening question'
  );

  // Set time to near expiration (29m 30s into a 30m interview -> 30 seconds left)
  interviewEngine.updateElapsedTime(testInterview.id, 30 * 60 - 30);

  // Submit candidate answer when time is low
  const timeLowResult = await interviewEngine.submitAnswer(
    testInterview.id,
    "Here is my quick answer covering user problems and core tradeoffs."
  );

  assert(
    timeLowResult.state.currentStage === 'INTERVIEW_COMPLETE' ||
      timeLowResult.interviewerResponse.actionType === 'end_interview' ||
      timeLowResult.interviewerResponse.actionType === 'move_to_next_section',
    'Scenario 11: Engine avoids deep rabbit hole probe when time is running low'
  );

  // ----------------------------------------------------
  // SCENARIO 12: Browser Refresh / Persistence Restoration
  // ----------------------------------------------------
  console.log('\n--- Scenario 12: State Restoration Across Refresh ---');
  const restoredState = interviewStorage.getInterviewStateByInterviewId(testInterview.id);
  const restoredExchanges = interviewStorage.getExchangesForInterview(testInterview.id);
  const restoredPlan = interviewStorage.getInterviewPlanByInterviewId(testInterview.id);

  assert(restoredState !== null, 'Scenario 12: State exists in localStorage');
  assert(restoredPlan !== null, 'Scenario 12: Plan exists in localStorage');
  assert(restoredExchanges.length >= 2, 'Scenario 12: Exchanges are safely persisted in localStorage');

  // Calling startInterview on existing session returns stored state without restarting
  const resumeResult = await interviewEngine.startInterview(testInterview.id);
  assert(
    resumeResult.exchanges.length === restoredExchanges.length,
    'Scenario 12: Resumed interview preserved exact exchange history count'
  );

  console.log('\n======================================================');
  console.log(`Test Suite Complete: ${passedTests} / ${totalTests} tests passed!`);
  console.log('======================================================\n');
}

runAllScenarios().catch((err) => {
  console.error('Test Suite Failed with Exception:', err);
  process.exit(1);
});
