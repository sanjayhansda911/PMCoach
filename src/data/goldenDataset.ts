import { EvalCase } from '../types';

export const GOLDEN_DATASET: EvalCase[] = [
  // =========================================================================
  // INTERVIEWER CASES (1 to 15)
  // =========================================================================

  // 1. Good opening question
  {
    id: 'CASE-01',
    name: 'Good opening question',
    category: 'good_opening_question',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer opens the session with a calibrated, structured product framing question.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "Hello! Welcome to your interview. Let's begin.",
      answerText: "Hi, thanks for having me! I'm ready to begin.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
      history: [],
      jobProfile: { domain: 'E-commerce and Marketplace' },
    },
    expectedBehavior:
      'The interviewer should establish a realistic PM problem prompt for the target domain (e.g. improving mobile checkout retention) without being overly prescriptive or revealing the scoring rubric.',
    expectedSignals: ['clear_problem_definition', 'user_identification'],
    unacceptableBehavior: [
      'Asking generic trivia questions unrelated to PM problem solving.',
      'Revealing evaluation criteria or grading formulas before posing the question.',
    ],
    referenceEvaluation: {
      expectedMetrics: { relevance: 2, adaptiveness: 2, pm_realism: 2, plan_adherence: 2 },
      keyReasoningPoints: [
        'Frames an open-ended yet grounded product objective.',
        'Invites the candidate to define the problem and target user segment.',
      ],
      rationale: 'A good PM interview opening presents a clear scope while giving the candidate room to demonstrate product sense.',
    },
    tags: ['interviewer', 'opening', 'product-sense'],
  },

  // 2. Relevant follow-up
  {
    id: 'CASE-02',
    name: 'Relevant follow-up',
    category: 'relevant_followup',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer generates a relevant follow-up that directly relates to the candidate’s stated customer friction point.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "How would you improve the grocery shopping experience on a mobile app?",
      answerText:
        "I'd focus specifically on busy working parents doing weekly grocery planning. Their primary blocker is time spent re-adding staple items every single week from scratch, which leads to abandoned carts.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
      jobProfile: { domain: 'Grocery Delivery' },
    },
    expectedBehavior:
      'The interviewer should follow up on the specific problem space (staple items reordering / weekly grocery planning for working parents) rather than abruptly changing topics to payments or delivery logistics.',
    expectedSignals: ['user_identification', 'clear_problem_definition'],
    unacceptableBehavior: [
      'Changing the subject to warehouse robotics or supplier margins abruptly.',
      'Ignoring the working parents persona entirely.',
    ],
    referenceEvaluation: {
      expectedMetrics: { relevance: 2, adaptiveness: 2, probe_quality: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Builds directly upon the working parent pain point.',
        'Explores user workflow or asks how the candidate would solve recurring reorders.',
      ],
      rationale: 'Follow-ups must remain anchored in the candidate’s chosen user segment and problem definition.',
    },
    tags: ['interviewer', 'follow-up', 'relevance'],
  },

  // 3. Premature solution
  {
    id: 'CASE-03',
    name: 'Premature solution',
    category: 'premature_solution',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer catches a candidate jumping directly to a feature build without problem framing.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "How would you improve retention for a ride-sharing service?",
      answerText: "We should immediately build a virtual reality 3D avatar assistant in the car that plays trivia with passengers during rides.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
    },
    expectedBehavior:
      'The interviewer must gently redirect the candidate back to user problem definition and target persona before discussing feature mechanics.',
    expectedSignals: ['redirect_problem'],
    unacceptableBehavior: [
      'Accepting the VR avatar idea without questioning which rider problem it solves.',
      'Diving straight into 3D graphics latency and engineering implementation.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, adaptiveness: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Catches the premature leap to solution space.',
        'Asks the candidate to define the core rider pain point causing churn.',
      ],
      rationale: 'Senior interviewers always redirect solution-first candidates to clarify the underlying user need first.',
    },
    tags: ['interviewer', 'premature-solution', 'redirection'],
  },

  // 4. Missing metric
  {
    id: 'CASE-04',
    name: 'Missing metric',
    category: 'missing_metric',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer identifies when a candidate proposes a major feature without success metrics or guardrails.',
    competency: 'Execution',
    difficulty: 'Standard',
    input: {
      question: "How would you roll out the new one-click guest checkout?",
      answerText: "We will build a 1-click checkout button on the mobile product detail page and enable it for all international traffic next Tuesday.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Execution',
    },
    expectedBehavior:
      'The interviewer should probe for success metrics, measurable targets, and guardrails (such as fraud rate or accidental purchase rates).',
    expectedSignals: ['metric_definition'],
    unacceptableBehavior: [
      'Allowing an unmeasured 100% rollout to proceed without inquiring about verification metrics or rollback thresholds.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, relevance: 2, adaptiveness: 2 },
      keyReasoningPoints: [
        'Flags the complete absence of success and guardrail metrics.',
        'Asks how the candidate will verify impact or detect regressions.',
      ],
      rationale: 'Execution requires defining both target KPIs and protective guardrails before shipping.',
    },
    tags: ['interviewer', 'missing-metric', 'execution'],
  },

  // 5. Unsupported assumption
  {
    id: 'CASE-05',
    name: 'Unsupported assumption',
    category: 'unsupported_assumption',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer challenges ungrounded assertions made without user evidence.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "Which authentication methods should our B2B SaaS platform prioritize?",
      answerText: "Obviously everyone wants Web3 crypto wallet login and nobody ever uses passwords or Google SSO anymore, so we should delete passwords.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
    },
    expectedBehavior:
      'The interviewer should challenge the unsupported assumption and ask what customer data, telemetry, or user research supports that assertion.',
    expectedSignals: ['challenge_assumption'],
    unacceptableBehavior: [
      'Nodding along with unvalidated assumptions without requiring supporting evidence.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, adaptiveness: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Identifies the extreme, unsubstantiated generalization.',
        'Pushes the candidate to cite empirical user signals or risk assessments.',
      ],
      rationale: 'Strong PMs validate hypotheses with customer telemetry rather than personal assumptions.',
    },
    tags: ['interviewer', 'unsupported-assumption', 'probing'],
  },

  // 6. Weak prioritization
  {
    id: 'CASE-06',
    name: 'Weak prioritization',
    category: 'weak_prioritization',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer pushes for trade-offs when the candidate provides a laundry list of ideas.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "How would you improve student engagement on an educational platform?",
      answerText: "We can add gamified badges, AI tutoring, peer video rooms, dark mode, flashcards, teacher gradebooks, parent SMS notifications, and VR lectures.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
    },
    expectedBehavior:
      'The interviewer should ask the candidate to commit to a single primary direction and provide explicit prioritization criteria.',
    expectedSignals: ['prioritization'],
    unacceptableBehavior: [
      'Allowing the candidate to avoid making tradeoffs between 8 disparate features.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, adaptiveness: 2, relevance: 2 },
      keyReasoningPoints: [
        'Detects excessive breadth and lack of focus.',
        'Asks the candidate to pick the highest ROI feature for an initial MVP.',
      ],
      rationale: 'Product management is fundamentally about resource allocation and saying no to good ideas.',
    },
    tags: ['interviewer', 'weak-prioritization', 'tradeoffs'],
  },

  // 7. Strong answer requiring deeper probing
  {
    id: 'CASE-07',
    name: 'Strong answer requiring deeper probing',
    category: 'strong_answer_deep_probe',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer escalates complexity by introducing a realistic constraint for strong candidates.',
    competency: 'Strategy',
    difficulty: 'Challenging',
    input: {
      question: "How would you price our new enterprise analytics tier?",
      answerText:
        "I frame pricing around value metric alignment. For enterprise customers, consumption correlates with active data pipelines rather than seat count. " +
        "We should introduce a hybrid model: a platform base fee including up to 10 pipelines with 99.9% SLA, and metered billing for incremental throughput. " +
        "The trade-off is predictability for CFOs, so we offer annual commit discounts with quarterly true-ups.",
      targetRole: 'Senior Product Manager',
      difficulty: 'Challenging',
      competency: 'Strategy',
    },
    expectedBehavior:
      'The interviewer should recognize the solid structure and introduce an architectural, competitive, or operational constraint to test resilience.',
    expectedSignals: ['increase_constraint', 'tradeoff_reasoning'],
    unacceptableBehavior: [
      'Reverting to beginner questions like "what is a pricing tier?"',
      'Ending the section without probing edge cases or competitor retaliation.',
    ],
    referenceEvaluation: {
      expectedMetrics: { difficulty_calibration: 2, adaptiveness: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Recognizes a strong senior answer.',
        'Applies high-level stress test (e.g. competitor pricing war or enterprise procurement pushback).',
      ],
      rationale: 'Senior candidates should be tested at the boundaries of their frameworks.',
    },
    tags: ['interviewer', 'senior-probing', 'difficulty-calibration'],
  },

  // 8. Repetitive answer
  {
    id: 'CASE-08',
    name: 'Repetitive answer',
    category: 'repetitive_answer',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer detects circular reasoning and moves the conversation forward without repeating itself.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "Why do you believe users are abandoning their carts?",
      answerText: "They abandon carts because they don't complete the purchase. When they leave without buying, the cart is abandoned because they didn't finish.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
      history: [
        { role: 'interviewer', text: "What root cause is driving cart drop-off?" },
        { role: 'candidate', text: "Users drop off because carts are not purchased." },
      ],
    },
    expectedBehavior:
      'The interviewer should recognize the circular tautology and prompt for specific behavioral friction points (e.g. shipping fees, unexpected friction, authentication blockers).',
    expectedSignals: ['request_clarification'],
    unacceptableBehavior: [
      'Accepting the circular answer as a valid root cause.',
      'Asking the exact same question word-for-word a third time.',
    ],
    referenceEvaluation: {
      expectedMetrics: { repetition: 1, probe_quality: 2, adaptiveness: 2 },
      keyReasoningPoints: [
        'Identifies lack of causal reasoning.',
        'Reframes the question with concrete friction categories.',
      ],
      rationale: 'Interviewers must reframe when candidates give circular answers.',
    },
    tags: ['interviewer', 'repetitive-answer', 'reframing'],
  },

  // 9. Candidate changes direction
  {
    id: 'CASE-09',
    name: 'Candidate changes direction',
    category: 'candidate_changes_direction',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer smoothly accommodates a candidate who consciously pivots their hypothesis after deeper reflection.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "Which customer segment should we prioritize for our smart home device?",
      answerText:
        "Earlier I proposed elderly independent seniors, but upon considering our hardware cost and subscription model, I want to pivot to tech-forward suburban homeowners with high disposable income. Here is why...",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
    },
    expectedBehavior:
      'The interviewer should gracefully acknowledge the strategic pivot and evaluate the reasoning behind the new target segment.',
    expectedSignals: ['user_identification', 'tradeoff_reasoning'],
    unacceptableBehavior: [
      'Penalizing the candidate purely for changing their mind.',
      'Insisting they stick to the initial elderly persona despite the valid pivot rationale.',
    ],
    referenceEvaluation: {
      expectedMetrics: { adaptiveness: 2, relevance: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Encourages intellectual honesty and deliberate trade-off recognition.',
        'Follows the thread of the new rationale.',
      ],
      rationale: 'Pivoting based on economic reality is a positive PM trait when reasoned well.',
    },
    tags: ['interviewer', 'pivot', 'adaptiveness'],
  },

  // 10. Candidate contradicts previous answer
  {
    id: 'CASE-10',
    name: 'Candidate contradicts previous answer',
    category: 'candidate_contradicts',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer politely points out a direct contradiction between earlier and later statements.',
    competency: 'Execution',
    difficulty: 'Standard',
    input: {
      question: "How will this affect third-party seller margins?",
      answerText: "We will charge third-party sellers a 25% take rate on all transactions to maximize our platform revenue.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Execution',
      history: [
        { role: 'interviewer', text: "What is your guiding philosophy for merchant relations?" },
        { role: 'candidate', text: "Our top priority is zero-commission growth for our sellers so we can win supplier loyalty over Amazon." },
      ],
    },
    expectedBehavior:
      'The interviewer should highlight the tension between the zero-commission supplier strategy and the newly proposed 25% take rate.',
    expectedSignals: ['tradeoff_reasoning'],
    unacceptableBehavior: [
      'Ignoring the obvious strategic contradiction.',
      'Being confrontational or aggressive rather than inquisitive.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, adaptiveness: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Observes the discrepancy in seller monetization.',
        'Invites the candidate to reconcile the conflict.',
      ],
      rationale: 'Spotting inconsistencies in strategy is a core interviewer responsibility.',
    },
    tags: ['interviewer', 'contradiction', 'consistency'],
  },

  // 11. Resume-specific claim
  {
    id: 'CASE-11',
    name: 'Resume-specific claim',
    category: 'resume_specific_claim',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer anchors follow-ups into documented resume claims to verify attribution and depth.',
    competency: 'Leadership & Behavioral',
    difficulty: 'Challenging',
    input: {
      question: "Tell me about a time you launched an impactful feature.",
      answerText:
        "At FinCorp, I served as the Lead Product Manager on enterprise payments. " +
        "I recognized that enterprise checkout had high friction with multi-currency settlements, so I led the end-to-end redesign of our payments architecture. " +
        "Following our rollout across global accounts, our new workflow drove $50M in annual revenue by revamping enterprise checkout workflow.",
      targetRole: 'Senior Product Manager',
      difficulty: 'Challenging',
      competency: 'Leadership & Behavioral',
      candidateProfile: {
        candidateName: 'Alex Chen',
        metricsAndImpact: ['Drove $50M in annual revenue by revamping enterprise checkout workflow'],
      },
    },
    expectedBehavior:
      'The interviewer should probe the $50M ARR claim by asking how the candidate isolated their individual product contribution from market growth or marketing spend.',
    expectedSignals: ['quantified_impact'],
    unacceptableBehavior: [
      'Accepting the $50M metric without asking about attribution, challenges, or team dynamics.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, relevance: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Anchors directly into candidate’s documented resume achievement.',
        'Probes attribution and counterfactuals.',
      ],
      rationale: 'Behavioral interviews must verify candidate ownership behind large resume claims.',
    },
    tags: ['interviewer', 'resume-claim', 'attribution'],
  },

  // 12. JD-specific competency
  {
    id: 'CASE-12',
    name: 'JD-specific competency',
    category: 'jd_specific_competency',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer weaves in core requirements from the target Job Description.',
    competency: 'Execution',
    difficulty: 'Standard',
    input: {
      question: "How do you coordinate with infrastructure teams during a migration?",
      answerText: "I usually set up weekly syncs and ask engineering when they'll be done.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Execution',
      jobProfile: {
        domain: 'Developer Platforms and High-Throughput APIs',
        keyCompetencies: ['Latency SLA enforcement', 'Cross-service backward compatibility'],
      },
    },
    expectedBehavior:
      'The interviewer should probe platform-specific execution details such as API latency SLAs, backward compatibility, or breaking schema migration phases.',
    expectedSignals: ['metric_definition', 'risk_management'],
    unacceptableBehavior: [
      'Treating the platform PM interview like an aesthetic consumer UI interview.',
    ],
    referenceEvaluation: {
      expectedMetrics: { relevance: 2, plan_adherence: 2, probe_quality: 2 },
      keyReasoningPoints: [
        'Aligns probing with domain requirements in the job description.',
        'Tests technical product execution depth.',
      ],
      rationale: 'Interviews should reflect the unique competencies needed for the target job role.',
    },
    tags: ['interviewer', 'job-description', 'platform-pm'],
  },

  // 13. Very short candidate answer
  {
    id: 'CASE-13',
    name: 'Very short candidate answer',
    category: 'very_short_answer',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer appropriately prompts for elaboration without showing irritation.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "How would you improve the rider experience during bad weather?",
      answerText: "Lower the prices.",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
    },
    expectedBehavior:
      'The interviewer should ask the candidate to break down their logic and consider the supply-side impact on drivers.',
    expectedSignals: ['request_clarification', 'tradeoff_reasoning'],
    unacceptableBehavior: [
      'Accepting a 3-word answer and immediately moving to the next section.',
      'Mocking or chastising the candidate.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, adaptiveness: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Prompts for reasoning breakdown.',
        'Maintains encouraging and neutral interviewer demeanor.',
      ],
      rationale: 'A good interviewer draws out candidate reasoning when initial answers are terse.',
    },
    tags: ['interviewer', 'terse-answer', 'clarification'],
  },

  // 14. Extremely long candidate answer
  {
    id: 'CASE-14',
    name: 'Extremely long candidate answer',
    category: 'extremely_long_answer',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer helps a rambling candidate synthesize their key takeaway without being rude.',
    competency: 'Communication',
    difficulty: 'Standard',
    input: {
      question: "What is your strategy for international expansion?",
      answerText:
        "Well, first we went to London in 2018 and my manager told me about VAT and then we also looked at Germany where language is different and then also our database didn't have UTF-8 support so we had to call the DBA and also payments in Netherlands use iDEAL which took 4 months and also we had a marketing person who left on maternity leave and also compliance requires GDPR and also another thing is local currencies...",
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Communication',
    },
    expectedBehavior:
      'The interviewer should politely prompt the candidate to summarize the top 1–2 strategic pillars or key framework principles.',
    expectedSignals: ['prioritization', 'structured_communication'],
    unacceptableBehavior: [
      'Letting the rambling continue indefinitely without synthesis.',
      'Abruptly cutting the candidate off aggressively.',
    ],
    referenceEvaluation: {
      expectedMetrics: { probe_quality: 2, adaptiveness: 2, pm_realism: 2 },
      keyReasoningPoints: [
        'Identifies the lack of concise synthesis.',
        'Guides candidate to distill their answer into actionable criteria.',
      ],
      rationale: 'Interviewers must manage conversation time and test executive summary skills.',
    },
    tags: ['interviewer', 'rambling', 'synthesis'],
  },

  // 15. Time running low
  {
    id: 'CASE-15',
    name: 'Time running low',
    category: 'time_running_low',
    systemType: 'interviewer',
    description: 'Tests whether the interviewer avoids opening new complex rabbit holes when only 90 seconds remain.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      question: "How would you handle driver supply shortages in peak hours?",
      answerText: "We can incentivize drivers with guaranteed hourly floors.",
      timeRemainingSeconds: 75,
      targetRole: 'Product Manager',
      difficulty: 'Standard',
      competency: 'Product Sense',
    },
    expectedBehavior:
      'The interviewer should wrap up the section or ask for a high-level summary rather than launching a brand-new multi-part investigation.',
    expectedSignals: ['time_management'],
    unacceptableBehavior: [
      'Starting an extensive new 15-minute case when under 2 minutes remain.',
    ],
    referenceEvaluation: {
      expectedMetrics: { pm_realism: 2, adaptiveness: 2, plan_adherence: 2 },
      keyReasoningPoints: [
        'Respects session time constraints.',
        'Pivots toward synthesis and closing remarks.',
      ],
      rationale: 'Effective time management is critical in real product management interviews.',
    },
    tags: ['interviewer', 'time-management', 'closing'],
  },

  // =========================================================================
  // EVALUATOR CASES (16 to 25)
  // =========================================================================

  // 16. Strong Product Sense
  {
    id: 'CASE-16',
    name: 'Strong Product Sense',
    category: 'strong_product_sense',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator assigns a high score (4-5) with grounded quotes when the candidate excels in problem framing, segmentation, and trade-offs.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-16', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'How would you improve the grocery shopping experience on mobile?' },
        {
          role: 'candidate',
          text:
            "Let's clarify the core problem and objective first. Rather than building generic features, our goal is increasing repeat purchase retention. " +
            "I segment shoppers into three distinct cohorts: 1) weekly meal planners, 2) spontaneous daily shoppers, and 3) deal hunters. " +
            "I prioritize weekly meal planners because they generate 65% of lifetime value but drop off due to the friction of re-adding staple groceries every Sunday. " +
            "The key trade-off is deprioritizing recipe inspiration features to double down on 1-click staple replenishment.",
        },
      ],
    },
    expectedBehavior:
      'The evaluator must rate Product Sense at 4 or 5, cite exact verbatim quotes as evidence, and commend problem framing, segmentation, and conscious trade-offs.',
    expectedSignals: ['clear_problem_definition', 'segmentation', 'tradeoff_reasoning'],
    unacceptableBehavior: [
      'Giving a low score (1-2) to a demonstrably thorough answer.',
      'Inventing quotes that do not appear verbatim in the candidate response.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [4, 5],
      expectedMetrics: { score_validity: 2, evidence_accuracy: 2, rubric_adherence: 2 },
      keyReasoningPoints: [
        'Exemplary framing before jumping to solution.',
        'Clear cohort segmentation with quantified prioritization rationale.',
        'Conscious deprioritization of competing features.',
      ],
      rationale: 'Demonstrates senior-level PM product judgment with grounded trade-off analysis.',
    },
    tags: ['evaluator', 'strong-product-sense', 'rubric'],
  },

  // 17. Weak Product Sense
  {
    id: 'CASE-17',
    name: 'Weak Product Sense',
    category: 'weak_product_sense',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator penalizes feature-first thinking and lack of user problem definition.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-17', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'How would you improve the grocery shopping experience?' },
        { role: 'candidate', text: 'We should immediately build an AI assistant with 3D animations that talks to users while they shop.' },
      ],
    },
    expectedBehavior:
      'The evaluator must assign Product Sense a score of 1 or 2, flag premature solutioning, and note the absence of user persona framing.',
    expectedSignals: ['premature_solution'],
    unacceptableBehavior: [
      'Rewarding the candidate for mentioning "AI" without problem framing.',
      'Scoring the answer as 4 or 5.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [1, 2],
      expectedMetrics: { score_validity: 2, rubric_adherence: 2, framework_bias: 1 },
      keyReasoningPoints: [
        'Jumped straight to building solutions without understanding user friction.',
        'No user segmentation or alternative trade-offs considered.',
      ],
      rationale: 'Feature-first proposals without problem validation represent weak PM discipline.',
    },
    tags: ['evaluator', 'weak-product-sense', 'premature-solution'],
  },

  // 18. Strong Analytics
  {
    id: 'CASE-18',
    name: 'Strong Analytics',
    category: 'strong_analytics',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator rewards metric decomposition, cohort analysis, and hypothesis formulation.',
    competency: 'Analytics',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-18', targetRole: 'Product Manager', interviewType: 'Analytics' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Analytics' }] },
      transcript: [
        { role: 'interviewer', text: 'Checkout conversion dropped 10% yesterday. How do you diagnose it?' },
        {
          role: 'candidate',
          text:
            "To diagnose the 10% drop in checkout conversion rate, I would systematically decompose the metric into its underlying funnel stages: cart page views, shipping entry, payment authorization, and order confirmation. " +
            "Next, I segment the drop across dimensions: platform (iOS vs Android), geography, and payment processor. " +
            "My hypothesis is that a recent mobile release caused an API authorization latency regression for European debit cards. " +
            "I will verify telemetry logs against this threshold before deploying an automated rollback.",
        },
      ],
    },
    expectedBehavior:
      'The evaluator must rate Analytics at 4 or 5, cite exact verbatim quotes, and commend the funnel decomposition and falsifiable hypothesis.',
    expectedSignals: ['metric_decomposition', 'hypothesis_testing'],
    unacceptableBehavior: [
      'Rating this rigorous analytical response as low or average.',
      'Misidentifying the funnel breakdown as vague thinking.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [4, 5],
      expectedMetrics: { score_validity: 2, evidence_accuracy: 2, rubric_adherence: 2 },
      keyReasoningPoints: [
        'Systematic decomposition into funnel components.',
        'Dimensional segmentation across platform and region.',
        'Clear falsifiable hypothesis with validation criteria.',
      ],
      rationale: 'Gold-standard execution for an analytical root-cause diagnosis question.',
    },
    tags: ['evaluator', 'strong-analytics', 'metrics'],
  },

  // 19. Weak Analytics
  {
    id: 'CASE-19',
    name: 'Weak Analytics',
    category: 'weak_analytics',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator penalizes vague, non-measurable success definitions like "make users happy".',
    competency: 'Analytics',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-19', targetRole: 'Product Manager', interviewType: 'Analytics' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Analytics' }] },
      transcript: [
        { role: 'interviewer', text: 'What metrics would you track for this feature?' },
        { role: 'candidate', text: 'We just want to improve engagement and make users happy with a better experience so our brand will grow.' },
      ],
    },
    expectedBehavior:
      'The evaluator must assign a score of 1 or 2 to Analytics and explicitly note the lack of concrete formulas, funnel steps, or guardrail metrics.',
    expectedSignals: ['missing_metric'],
    unacceptableBehavior: [
      'Giving credit for buzzwords like "engagement" without operational metrics.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [1, 2],
      expectedMetrics: { score_validity: 2, rubric_adherence: 2 },
      keyReasoningPoints: [
        'Vague, qualitative aspirations without measurable indicators.',
        'No distinction between leading and lagging indicators.',
      ],
      rationale: 'PMs must translate high-level business goals into measurable operational metrics.',
    },
    tags: ['evaluator', 'weak-analytics', 'vague-metrics'],
  },

  // 20. Strong communication but weak reasoning
  {
    id: 'CASE-20',
    name: 'Strong communication but weak reasoning',
    category: 'strong_comm_weak_reasoning',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator distinguishes communication signposting from substance, and avoids inflating overall score.',
    competency: 'Communication',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-20', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'Which product feature would you prioritize?' },
        {
          role: 'candidate',
          text:
            "First, I would like to structure my answer clearly. " +
            "Second, in summary, we should build both feature A and feature B because they are both nice. " +
            "Third, in conclusion, our team will launch them next month.",
        },
      ],
    },
    expectedBehavior:
      'The evaluator should rate Communication reasonably high (4-5) for signposting, but rate Product Sense low (1-2), keeping overall score modest (<70).',
    expectedSignals: ['structured_communication'],
    unacceptableBehavior: [
      'Conflating polished delivery with strong product reasoning.',
      'Assigning Product Sense a high score due to smooth delivery.',
    ],
    referenceEvaluation: {
      expectedMetrics: { communication_separation: 1, score_validity: 2, rubric_adherence: 2 },
      keyReasoningPoints: [
        'Clear speech structure and signposting.',
        'Completely devoid of prioritization criteria or user problem breakdown.',
      ],
      rationale: 'Polished rhetoric must never mask empty product substance.',
    },
    tags: ['evaluator', 'communication-separation', 'anti-halo'],
  },

  // 21. Strong reasoning but weak communication
  {
    id: 'CASE-21',
    name: 'Strong reasoning but weak communication',
    category: 'strong_reasoning_weak_comm',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator recognizes solid product analysis even when wrapped in rambling run-on sentences.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-21', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'Walk through your recommendation for checkout.' },
        {
          role: 'candidate',
          text:
            "So um basically the problem is really deep with guest checkout shoppers because first-time users drop off when asked for a password, also another thing is shipping costs and we also noticed that repeat buyers behave totally differently so we must segment them, and also we need to prioritize 1-click checkout for guests while deprioritizing social login, and also there is a huge tradeoff with fraud where we sacrifice some fraud checks on orders under $50 to increase conversion, and another thing is we also have to coordinate with payments and also another thing is engineering capacity...",
        },
      ],
    },
    expectedBehavior:
      'The evaluator should rate Product Sense at 4 or 5 (recognizing problem framing, segmentation, and fraud trade-offs), while rating Communication at 2 or 3 for run-on sentences.',
    expectedSignals: ['clear_problem_definition', 'segmentation', 'tradeoff_reasoning'],
    unacceptableBehavior: [
      'Tanking the Product Sense score to 1 or 2 solely because the candidate rambled.',
      'Giving Communication a 5 despite obvious run-on filler sentences.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [4, 5],
      expectedMetrics: { communication_separation: 1, score_validity: 2 },
      keyReasoningPoints: [
        'High-quality product intuition, segmentation, and fraud trade-off.',
        'Conversational, unpunctuated rambling requiring synthesis coaching.',
      ],
      rationale: 'Great thinkers sometimes ramble; evaluators must separate thought quality from verbal packaging.',
    },
    tags: ['evaluator', 'reasoning-vs-delivery', 'communication'],
  },

  // 22. Insufficient evidence
  {
    id: 'CASE-22',
    name: 'Insufficient evidence',
    category: 'insufficient_evidence',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator lowers confidence and states insufficient evidence rather than hallucinating assessments.',
    competency: 'Strategy',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-22', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'Do you agree with the customer research findings?' },
        { role: 'candidate', text: 'Yes, I agree with that.' },
      ],
    },
    expectedBehavior:
      'The evaluator must mark untested competencies (like Strategy or Execution) with low confidence, note insufficient evidence in the transcript, and generate zero hallucinated quotes.',
    expectedSignals: [],
    unacceptableBehavior: [
      'Fabricating quotes or awarding high confidence scores for competencies not tested in the brief transcript.',
    ],
    referenceEvaluation: {
      expectedMetrics: { insufficient_evidence_handling: 1, evidence_accuracy: 2 },
      keyReasoningPoints: [
        'Marks confidence as low for untested competencies.',
        'Explicitly mentions insufficient transcript evidence rather than making assumptions.',
      ],
      rationale: 'Evaluators must be honest about data limitations and never invent evidence.',
    },
    tags: ['evaluator', 'insufficient-evidence', 'calibration'],
  },

  // 23. Contradictory answers
  {
    id: 'CASE-23',
    name: 'Contradictory answers',
    category: 'contradictory_answers',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator flags strategic contradictions across multiple transcript answers.',
    competency: 'Strategy',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-23', targetRole: 'Product Manager', interviewType: 'Strategy' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Strategy' }] },
      transcript: [
        { role: 'interviewer', text: 'What is your monetization approach for small merchants?' },
        { role: 'candidate', text: 'We will strictly maintain zero commissions to maximize merchant acquisition and beat Shopify.' },
        { role: 'interviewer', text: 'How do you plan to reach profitability next quarter?' },
        { role: 'candidate', text: 'We will implement an aggressive 20% commission on all merchant transactions starting next month.' },
      ],
    },
    expectedBehavior:
      'The evaluator must document the cross-answer contradiction in observations and penalize strategic consistency.',
    expectedSignals: ['tradeoff_reasoning'],
    unacceptableBehavior: [
      'Evaluating each answer in total isolation without noticing the direct strategic conflict.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [2, 3],
      expectedMetrics: { score_validity: 2, rubric_adherence: 2, consistency: 2 },
      keyReasoningPoints: [
        'Flags the unresolved tension between zero-commission and 20% take rate.',
        'Records cross-interview inconsistency in strategic execution.',
      ],
      rationale: 'Product leaders must demonstrate strategic coherence across the entire conversation.',
    },
    tags: ['evaluator', 'cross-answer', 'contradiction'],
  },

  // 24. Candidate uses an unconventional but valid framework
  {
    id: 'CASE-24',
    name: 'Candidate uses unconventional framework',
    category: 'unconventional_valid_framework',
    systemType: 'evaluator',
    description: 'Tests whether the evaluator rewards sound first-principles reasoning even when the candidate does not use textbook PM frameworks.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-24', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'How would you approach designing a community tool for developers?' },
        {
          role: 'candidate',
          text:
            "Instead of standard acronyms, I use a three-lens physics analogy: Friction, Gravity, and Thermal Velocity. " +
            "Friction represents cognitive onboarding load for terminal users. " +
            "Gravity is the density of existing open-source package repositories that keeps developers in our ecosystem. " +
            "Thermal Velocity is how quickly community answers get answered by peers. " +
            "We must reduce Friction by offering a 1-command CLI login before we try to expand Gravity.",
        },
      ],
    },
    expectedBehavior:
      'The evaluator should recognize sound, structured problem analysis and reward the reasoning rather than penalizing the absence of CIRCLES or RICE.',
    expectedSignals: ['clear_problem_definition', 'prioritization'],
    unacceptableBehavior: [
      'Penalizing the candidate for not using standard CIRCLES or RICE terminology.',
    ],
    referenceEvaluation: {
      expectedScoreRange: [4, 5],
      expectedMetrics: { framework_bias: 1, score_validity: 2, rubric_adherence: 2 },
      keyReasoningPoints: [
        'Applies logical first-principles reasoning to user onboarding and retention.',
        'Evaluates depth of thought over adherence to industry jargon.',
      ],
      rationale: 'Top PMs think from first principles rather than memorizing formulaic acronyms.',
    },
    tags: ['evaluator', 'first-principles', 'framework-independence'],
  },

  // 25. Candidate uses PM framework keywords but demonstrates weak reasoning
  {
    id: 'CASE-25',
    name: 'Framework keywords with weak reasoning',
    category: 'framework_keywords_weak_reasoning',
    systemType: 'evaluator',
    description: 'Tests anti-keyword bias: ensuring the evaluator does NOT give a high score merely for dropping CIRCLES and RICE without real substance.',
    competency: 'Product Sense',
    difficulty: 'Standard',
    input: {
      interview: { id: 'int-25', targetRole: 'Product Manager', interviewType: 'Product Sense' },
      interviewPlan: { sections: [{ id: 's-1', competency: 'Product Sense' }] },
      transcript: [
        { role: 'interviewer', text: 'Which feature would you prioritize?' },
        {
          role: 'candidate',
          text:
            "First, I would like to structure my answer using the RICE framework and CIRCLES framework. " +
            "Second, in summary, we can try both feature A and feature B because both features are very nice. " +
            "Third, to structure this, our North Star metric will be user happiness and we will launch next week.",
        },
      ],
    },
    expectedBehavior:
      'The evaluator must assign Product Sense a low score (1-2) and note that citing framework names does not replace actual customer segmentation or trade-off evaluation.',
    expectedSignals: [],
    unacceptableBehavior: [
      'Giving a high score (4-5) simply because the candidate said "RICE", "CIRCLES", and "North Star".',
    ],
    referenceEvaluation: {
      expectedScoreRange: [1, 2],
      expectedMetrics: { framework_bias: 1, score_validity: 2, rubric_adherence: 2 },
      keyReasoningPoints: [
        'Superficial name-dropping of frameworks without operationalizing their steps.',
        'Vacuous success definition ("user happiness") and zero prioritization criteria.',
      ],
      rationale: 'Framework name-dropping is an anti-pattern in PM interviewing.',
    },
    tags: ['evaluator', 'anti-framework-bias', 'buzzwords'],
  },
];
