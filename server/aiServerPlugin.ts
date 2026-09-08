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


import {
  factualResumeParser,
  factualJdParser,
  factualMatcher,
  factualBriefGenerator,
  factualPlanGenerator,
  factualAnswerAnalyzer,
  factualFollowUpGenerator,
  factualEvaluationEngine,
} from '../src/services/factualEngine.ts';

export {
  factualResumeParser,
  factualJdParser,
  factualMatcher,
  factualBriefGenerator,
  factualPlanGenerator,
  factualAnswerAnalyzer,
  factualFollowUpGenerator,
  factualEvaluationEngine,
};

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
