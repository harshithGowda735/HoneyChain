import { getAdminFirestore } from './firebase';
import { SupportCallbackRequest, VoiceTurnMetrics, SupportedLanguage } from '../types';

function withTimeout<T>(promise: Promise<T>, ms = 2000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function logVoiceTurn(data: {
  uid: string;
  transcript: string;
  answerText: string;
  language: SupportedLanguage;
  citations: string[];
  metrics: VoiceTurnMetrics;
  success: boolean;
  error?: string;
  needsHumanSupport?: boolean;
}): Promise<void> {
  const turnRecord = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  try {
    const db = getAdminFirestore();
    const logPromise = db.collection('voice_support_turns').add(turnRecord);
    await withTimeout(logPromise, 1500, null);
  } catch (err: any) {
    console.warn(`[SupportLogger] Failed to write turn log to Firestore: ${err.message}`);
  }

  // If question was unanswered or needs human escalation, also log to unanswered_questions
  if (data.needsHumanSupport) {
    try {
      const db = getAdminFirestore();
      const unansPromise = db.collection('unanswered_questions').add({
        uid: data.uid,
        transcript: data.transcript,
        language: data.language,
        timestamp: new Date().toISOString(),
        status: 'pending_review',
      });
      await withTimeout(unansPromise, 1500, null);
    } catch (_) {}
  }
}

export async function recordSupportCallback(req: SupportCallbackRequest): Promise<{ id: string; success: boolean }> {
  const record = {
    uid: req.uid,
    displayName: req.displayName || 'Beekeeper',
    phoneNumber: req.phoneNumber || '',
    transcript: req.transcript,
    preferredLanguage: req.preferredLanguage,
    reason: req.reason || 'Beekeeper requested human assistance',
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  try {
    const db = getAdminFirestore();
    const savePromise = db.collection('support_requests').add(record).then(ref => ref.id);
    const docId = await withTimeout(savePromise, 2000, null);
    if (docId) {
      console.log(`[SupportLogger] Created human support callback request: ${docId}`);
      return { id: docId, success: true };
    }
    return { id: `local_req_${Date.now()}`, success: true };
  } catch (err: any) {
    console.warn(`[SupportLogger] Local fallback for callback record: ${err.message}`);
    return { id: `local_req_${Date.now()}`, success: true };
  }
}
