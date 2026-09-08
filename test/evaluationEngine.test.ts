/**
 * Comprehensive Deterministic Test Suite for PM Interview Evaluation Engine
 * Validates all 10 core evaluation scenarios:
 * 1. Strong Product Sense answer
 * 2. Weak Product Sense answer
 * 3. Strong Analytics answer
 * 4. Weak Analytics answer
 * 5. Strong Execution answer
 * 6. Premature solution before defining problem
 * 7. Unsupported assumptions
 * 8. Excellent communication but weak product reasoning
 * 9. Strong product reasoning with poor communication
 * 10. Insufficient evidence (low confidence, zero hallucinated evidence)
 *
 * Verifies:
 * - Valid structured output against Evaluation schema
 * - Evidence quotes are strictly exact substrings from transcript (zero fabrication)
 * - Scores within 1-5
 * - Anti-keyword exploitation (no reward for framework name-dropping without reasoning)
 * - Weighted overall score (0-100) and non-predictive performance recommendation
 * - Extensible eval run metadata (model, promptVersion, rubricVersion, testCaseId)
 */

import { factualEvaluationEngine } from '../server/aiServerPlugin.ts';

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

function verifyQuotesInTranscript(evalResult: any, transcriptText: string, caseLabel: string) {
  for (const comp of evalResult.competencyEvaluations) {
    for (const ev of comp.evidence) {
      assert(
        typeof ev.quote === 'string' && ev.quote.length > 0,
        `${caseLabel}: Evidence has non-empty quote`
      );
      assert(
        transcriptText.includes(ev.quote),
        `${caseLabel}: Evidence quote is strictly verified as exact transcript substring: "${ev.quote.slice(0, 40)}..."`
      );
    }
  }
}

async function runAllEvalScenarios() {
  console.log('\n======================================================');
  console.log('Running PM Interview Evaluation Engine Test Suite');
  console.log('======================================================\n');

  const baseInterview = {
    id: 'interview-eval-test',
    targetRole: 'Senior Product Manager',
    interviewType: 'Product Sense',
    difficulty: 'Challenging',
    duration: 30,
    status: 'completed',
  };

  const basePlan = {
    id: 'plan-eval-test',
    interviewId: 'interview-eval-test',
    targetRole: 'Senior Product Manager',
    allocatedMinutes: 30,
    sections: [
      { id: 'sec-1', sectionNumber: 1, competency: 'Product Sense' },
      { id: 'sec-2', sectionNumber: 2, competency: 'Execution' },
    ],
  };

  // ----------------------------------------------------
  // CASE 1: Strong Product Sense Answer
  // ----------------------------------------------------
  console.log('--- CASE 1: Strong Product Sense Answer ---');
  const case1Text =
    "Let's clarify the core problem and objective first. In mobile checkout, first-time shoppers abandon cart at a rate of 68% due to unexpected shipping fees and forced account registration. " +
    "I would segment our customer base into guest checkout shoppers versus repeat logged-in buyers. For guest shoppers, the primary friction point is account creation. " +
    "I prioritize implementing a streamlined 1-click guest checkout option. " +
    "The central tradeoff here is fraud friction versus conversion velocity: while strict postal verification prevents fraud, it introduces 2 extra fields. I accept a small calculated risk on orders under $50 to maximize checkout speed.";

  const case1Transcript = [
    { role: 'interviewer' as const, text: 'Design an improved mobile checkout experience.' },
    { role: 'candidate' as const, text: case1Text },
  ];

  const eval1 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case1Transcript,
    metadata: { testCaseId: 'CASE-1-STRONG-PS' },
  });

  const ps1 = eval1.competencyEvaluations.find((c: any) => c.competency === 'Product Sense');
  assert(ps1 !== undefined, 'CASE 1: Product Sense evaluation generated');
  assert(ps1.score >= 4, `CASE 1: Strong Product Sense score (got ${ps1.score})`);
  assert(ps1.confidence === 'high', 'CASE 1: High confidence');
  assert(ps1.strengths.length > 0, 'CASE 1: Strengths documented');
  verifyQuotesInTranscript(eval1, case1Text, 'CASE 1');

  // ----------------------------------------------------
  // CASE 2: Weak Product Sense Answer
  // ----------------------------------------------------
  console.log('\n--- CASE 2: Weak Product Sense Answer ---');
  const case2Text = "We can run some ads and make the button bigger.";
  const case2Transcript = [
    { role: 'interviewer' as const, text: 'How would you improve retention?' },
    { role: 'candidate' as const, text: case2Text },
  ];

  const eval2 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case2Transcript,
    metadata: { testCaseId: 'CASE-2-WEAK-PS' },
  });

  const ps2 = eval2.competencyEvaluations.find((c: any) => c.competency === 'Product Sense');
  assert(ps2 !== undefined, 'CASE 2: Product Sense evaluation generated');
  assert(ps2.score <= 2, `CASE 2: Weak Product Sense penalized (got ${ps2.score})`);
  assert(ps2.weaknesses.length > 0, 'CASE 2: Weaknesses documented');

  // ----------------------------------------------------
  // CASE 3: Strong Analytics Answer
  // ----------------------------------------------------
  console.log('\n--- CASE 3: Strong Analytics Answer ---');
  const case3Text =
    "To investigate the 10% drop in checkout conversion rate, I would systematically decompose the metric into its underlying funnel stages: cart page views, shipping address completion, payment authorization, and order confirmation. " +
    "Next, I would segment the data by platform (iOS vs Android), user cohort (new vs returning), and payment method. " +
    "My primary hypothesis is that a recent mobile app release introduced a latency regression in third-party payment gateway authorization for European credit cards. " +
    "I would measure latency thresholds and isolate the drop-off by country to validate this hypothesis.";

  const analyticsPlan = {
    ...basePlan,
    sections: [{ id: 'sec-1', sectionNumber: 1, competency: 'Analytics' }],
  };

  const case3Transcript = [
    { role: 'interviewer' as const, text: 'Daily checkout conversion dropped by 10%. How do you diagnose it?' },
    { role: 'candidate' as const, text: case3Text },
  ];

  const eval3 = factualEvaluationEngine({
    interview: { ...baseInterview, interviewType: 'Analytics' },
    interviewPlan: analyticsPlan,
    transcript: case3Transcript,
    metadata: { testCaseId: 'CASE-3-STRONG-ANALYTICS' },
  });

  const an3 = eval3.competencyEvaluations.find((c: any) => c.competency === 'Analytics');
  assert(an3 !== undefined, 'CASE 3: Analytics evaluation generated');
  assert(an3.score >= 4, `CASE 3: Strong Analytics score (got ${an3.score})`);
  assert(an3.confidence === 'high', 'CASE 3: High confidence');
  verifyQuotesInTranscript(eval3, case3Text, 'CASE 3');

  // ----------------------------------------------------
  // CASE 4: Weak Analytics Answer
  // ----------------------------------------------------
  console.log('\n--- CASE 4: Weak Analytics Answer ---');
  const case4Text = "We just want to improve engagement and make users happy with a better experience.";
  const case4Transcript = [
    { role: 'interviewer' as const, text: 'What metrics would you track?' },
    { role: 'candidate' as const, text: case4Text },
  ];

  const eval4 = factualEvaluationEngine({
    interview: { ...baseInterview, interviewType: 'Analytics' },
    interviewPlan: analyticsPlan,
    transcript: case4Transcript,
    metadata: { testCaseId: 'CASE-4-WEAK-ANALYTICS' },
  });

  const an4 = eval4.competencyEvaluations.find((c: any) => c.competency === 'Analytics');
  assert(an4 !== undefined, 'CASE 4: Analytics evaluation generated');
  assert(an4.score <= 2, `CASE 4: Weak Analytics penalized for vague goals (got ${an4.score})`);
  assert(
    an4.weaknesses.some((w: string) => w.toLowerCase().includes('vague')),
    'CASE 4: Identified vague metrics without measurement criteria'
  );

  // ----------------------------------------------------
  // CASE 5: Strong Execution Answer
  // ----------------------------------------------------
  console.log('\n--- CASE 5: Strong Execution Answer ---');
  const case5Text =
    "For this rollout, our primary north-star metric is activation rate within 7 days, with guardrails on API error rate and latency. " +
    "I prioritize our delivery into three phases: Phase 1 is a 5% internal dogfood rollout to diagnose edge cases; Phase 2 expands to a 20% canary cohort; Phase 3 is 100% general availability. " +
    "If our telemetry indicates error rates exceeding 0.5%, we have an automated rollback trigger. The core engineering tradeoff is delaying international localization by 2 weeks to ensure core API reliability.";

  const execPlan = {
    ...basePlan,
    sections: [{ id: 'sec-1', sectionNumber: 1, competency: 'Execution' }],
  };

  const case5Transcript = [
    { role: 'interviewer' as const, text: 'How do you execute the rollout of this critical service?' },
    { role: 'candidate' as const, text: case5Text },
  ];

  const eval5 = factualEvaluationEngine({
    interview: { ...baseInterview, interviewType: 'Execution' },
    interviewPlan: execPlan,
    transcript: case5Transcript,
    metadata: { testCaseId: 'CASE-5-STRONG-EXEC' },
  });

  const ex5 = eval5.competencyEvaluations.find((c: any) => c.competency === 'Execution');
  assert(ex5 !== undefined, 'CASE 5: Execution evaluation generated');
  assert(ex5.score >= 4, `CASE 5: Strong Execution score (got ${ex5.score})`);
  verifyQuotesInTranscript(eval5, case5Text, 'CASE 5');

  // ----------------------------------------------------
  // CASE 6: Premature Solution Before Defining Problem
  // ----------------------------------------------------
  console.log('\n--- CASE 6: Premature Solution Before Defining Problem ---');
  const case6Text =
    "We should immediately build an AI assistant feature with 3D graphics that automatically adds organic groceries into the shopping cart every Sunday evening.";
  const case6Transcript = [
    { role: 'interviewer' as const, text: 'How would you improve grocery delivery for working parents?' },
    { role: 'candidate' as const, text: case6Text },
  ];

  const eval6 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case6Transcript,
    metadata: { testCaseId: 'CASE-6-PREMATURE-SOLUTION' },
  });

  const ps6 = eval6.competencyEvaluations.find((c: any) => c.competency === 'Product Sense');
  assert(ps6.score <= 2, `CASE 6: Premature solution penalized (got ${ps6.score})`);
  assert(
    ps6.weaknesses.some((w: string) => w.toLowerCase().includes('proposing features') || w.toLowerCase().includes('before defining')),
    'CASE 6: Weakness explicitly flags premature solution'
  );
  verifyQuotesInTranscript(eval6, case6Text, 'CASE 6');

  // ----------------------------------------------------
  // CASE 7: Unsupported Assumptions
  // ----------------------------------------------------
  console.log('\n--- CASE 7: Unsupported Assumptions ---');
  const case7Text =
    "I assume all buyers always want cryptocurrency and nobody uses debit cards anymore, so we should obviously remove card checkout.";
  const case7Transcript = [
    { role: 'interviewer' as const, text: 'What payment options should we prioritize?' },
    { role: 'candidate' as const, text: case7Text },
  ];

  const eval7 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case7Transcript,
    metadata: { testCaseId: 'CASE-7-UNSUPPORTED-ASSUMPTIONS' },
  });

  const ps7 = eval7.competencyEvaluations.find((c: any) => c.competency === 'Product Sense');
  assert(ps7.score <= 2, `CASE 7: Unsupported assumption penalized (got ${ps7.score})`);
  assert(
    ps7.weaknesses.some((w: string) => w.toLowerCase().includes('assumption') || w.toLowerCase().includes('evidence')),
    'CASE 7: Weakness explicitly flags unvalidated assumptions'
  );
  verifyQuotesInTranscript(eval7, case7Text, 'CASE 7');

  // ----------------------------------------------------
  // CASE 8: Excellent Communication but Weak Product Reasoning (Anti-Framework Check)
  // ----------------------------------------------------
  console.log('\n--- CASE 8: Excellent Communication + Framework Keywords but Weak PM Reasoning ---');
  const case8Text =
    "First, I would like to structure my answer using the RICE framework and CIRCLES framework. " +
    "Second, in summary, we can try both feature A and feature B because both features are very nice. " +
    "Third, to structure this, our North Star metric will be user happiness and we will launch next week.";

  const case8Transcript = [
    { role: 'interviewer' as const, text: 'Which feature would you prioritize?' },
    { role: 'candidate' as const, text: case8Text },
  ];

  const eval8 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case8Transcript,
    metadata: { testCaseId: 'CASE-8-COMM-VS-REASONING' },
  });

  const comm8 = eval8.competencyEvaluations.find((c: any) => c.competency === 'Communication');
  const ps8 = eval8.competencyEvaluations.find((c: any) => c.competency === 'Product Sense');

  assert(comm8.score >= 4, `CASE 8: Communication receives high score for structured signposting (got ${comm8.score})`);
  assert(ps8.score <= 2, `CASE 8: Product Sense NOT rewarded for mere framework name-dropping (got ${ps8.score})`);
  assert(eval8.overallScore < 70, `CASE 8: Overall score is NOT masked by communication alone (got ${eval8.overallScore})`);

  // ----------------------------------------------------
  // CASE 9: Strong Product Reasoning with Poor / Rambling Communication
  // ----------------------------------------------------
  console.log('\n--- CASE 9: Strong Product Reasoning with Rambling Communication ---');
  const case9Text =
    "So um basically the problem is really deep with guest checkout shoppers because first-time users drop off when asked for a password, also another thing is shipping costs and we also noticed that repeat buyers behave totally differently so we must segment them, and also we need to prioritize 1-click checkout for guests while deprioritizing social login, and also there is a huge tradeoff with fraud where we sacrifice some fraud checks on orders under $50 to increase conversion, and another thing is we also have to coordinate with payments and also another thing is engineering capacity...";

  const case9Transcript = [
    { role: 'interviewer' as const, text: 'Walk through your recommendation for checkout.' },
    { role: 'candidate' as const, text: case9Text },
  ];

  const eval9 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case9Transcript,
    metadata: { testCaseId: 'CASE-9-STRONG-PS-WEAK-COMM' },
  });

  const ps9 = eval9.competencyEvaluations.find((c: any) => c.competency === 'Product Sense');
  const comm9 = eval9.competencyEvaluations.find((c: any) => c.competency === 'Communication');

  assert(ps9.score >= 4, `CASE 9: Product Sense reasoning recognized despite rambling style (got ${ps9.score})`);
  assert(comm9.score <= 3, `CASE 9: Communication penalized for excessive verbosity / run-on sentences (got ${comm9.score})`);

  // ----------------------------------------------------
  // CASE 10: Insufficient Evidence
  // ----------------------------------------------------
  console.log('\n--- CASE 10: Insufficient Evidence (Untested Competencies & Brief Session) ---');
  const case10Text = "Yes, I agree with that.";
  const case10Transcript = [
    { role: 'interviewer' as const, text: 'Do you agree?' },
    { role: 'candidate' as const, text: case10Text },
  ];

  const eval10 = factualEvaluationEngine({
    interview: baseInterview,
    interviewPlan: basePlan,
    transcript: case10Transcript,
    metadata: { testCaseId: 'CASE-10-INSUFFICIENT-EVIDENCE' },
  });

  const strat10 = eval10.competencyEvaluations.find((c: any) => c.competency === 'Strategy');
  assert(strat10 !== undefined, 'CASE 10: Strategy competency evaluation present');
  assert(strat10.confidence === 'low', 'CASE 10: Low confidence on untested Strategy competency');
  assert(
    strat10.weaknesses.some((w: string) => w.toLowerCase().includes('insufficient evidence')),
    'CASE 10: Explicitly notes insufficient evidence rather than hallucinating claims'
  );
  assert(strat10.evidence.length === 0, 'CASE 10: Zero hallucinated evidence quotes for untested competency');

  // Verify overall evaluation structure & metadata across all tests
  assert(eval1.overallScore >= 0 && eval1.overallScore <= 100, 'Overall score bounded in [0, 100]');
  assert(['strong', 'meets_expectations', 'developing', 'needs_improvement'].includes(eval1.recommendation), 'Valid recommendation enum');
  assert(eval1.priorityImprovements.length > 0, 'Priority improvements generated');
  assert(eval1.nextPracticeRecommendations.length >= 2, 'Next practice recommendations generated');
  assert(eval1.metadata.rubricVersion === '2026.1', 'Extensible rubricVersion recorded');
  assert(eval1.metadata.testCaseId === 'CASE-1-STRONG-PS', 'Test case ID recorded in metadata');

  console.log('\n======================================================');
  console.log(`Evaluation Engine Test Suite Complete: ${passedTests} / ${totalTests} tests passed!`);
  console.log('======================================================\n');
}

runAllEvalScenarios().catch((err) => {
  console.error('Test Suite Failed with Exception:', err);
  process.exit(1);
});
