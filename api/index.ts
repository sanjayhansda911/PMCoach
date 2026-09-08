import type { IncomingMessage, ServerResponse } from 'http';
import {
  factualResumeParser,
  factualJdParser,
  factualMatcher,
  factualBriefGenerator,
  factualPlanGenerator,
  factualAnswerAnalyzer,
  factualFollowUpGenerator,
  factualEvaluationEngine,
} from '../src/services/factualEngine';

function parseBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body && typeof (req as any).body === 'object') {
    return Promise.resolve((req as any).body);
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Enable CORS for frontend API calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = req.url || '';
  const body = await parseBody(req);

  try {
    if (url.includes('/api/ai/parse-resume') || url.includes('/api/resume/process')) {
      const resumeText = body.resumeText || body.rawText;
      if (!resumeText) {
        return sendJson(res, 400, { error: 'Invalid or empty resume text.' });
      }
      return sendJson(res, 200, factualResumeParser(resumeText));
    }

    if (url.includes('/api/ai/parse-jd') || url.includes('/api/job/process')) {
      const jdText = body.jdText || body.rawJobDescription;
      return sendJson(res, 200, factualJdParser(jdText || '', body.targetRole));
    }

    if (url.includes('/api/ai/match')) {
      return sendJson(res, 200, factualMatcher(body.candidateProfile, body.jobProfile));
    }

    if (url.includes('/api/ai/create-brief')) {
      return sendJson(
        res,
        200,
        factualBriefGenerator(
          body.candidateProfile,
          body.jobProfile,
          body.match,
          body.targetRole,
          body.interviewType,
          body.difficulty
        )
      );
    }

    if (url.includes('/api/ai/interview/create-plan')) {
      return sendJson(res, 200, factualPlanGenerator(body));
    }

    if (url.includes('/api/ai/interview/analyze-answer')) {
      return sendJson(res, 200, factualAnswerAnalyzer(body));
    }

    if (url.includes('/api/ai/interview/generate-follow-up')) {
      return sendJson(res, 200, factualFollowUpGenerator(body));
    }

    if (url.includes('/api/ai/evaluation/evaluate')) {
      return sendJson(res, 200, factualEvaluationEngine(body));
    }

    return sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  } catch (err: any) {
    return sendJson(res, 500, { error: err.message || 'Internal API Error' });
  }
}
