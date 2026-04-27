/**
 * Emulator end-to-end smoke for the MVP run lifecycle + meta-progression.
 *
 * Drives:
 *   getOrCreatePlayer
 *   → startRun
 *   → submitStageOutcome ×9
 *   → bankCheckpoint @ stage 10
 *   → endRun (won)
 *   → verify player doc progression + audit trigger
 *
 * Prereq:
 *   1) `npm run emulators` (auth + firestore + functions) running in another shell
 *   2) `npm --prefix firebase/functions run build` is current
 *
 * Run via:
 *   `npm --prefix firebase/functions run smoke`
 */

import type { RewardBundle } from '../shared/types.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROJECT_ID = process.env['GCLOUD_PROJECT'] ?? 'myrpggame-c6f35';
const EMULATOR_HOST = process.env['FIREBASE_EMULATOR_HOST'] ?? '127.0.0.1';
const AUTH_PORT = 9099;
const FUNCTIONS_PORT = 5001;
const FIRESTORE_PORT = 8080;
const REGION = 'us-central1';

// Firebase Auth emulator accepts any string as Web API key.
const FAKE_API_KEY = 'fake-api-key';

// Starter class used in every smoke run.
const STARTER_CLASS_ID = 'drakehorn_forge.ember_initiate';
const STARTER_LINEAGE_ID = 'drakehorn_forge';
// T2 evolution target (set by client at startRun; computed from content).
// For the smoke test we just pass null since the server doesn't validate the value itself.
const EVOLUTION_TARGET_CLASS_ID: string | null = null;

// ---------------------------------------------------------------------------
// Tiny assertion / logging helpers
// ---------------------------------------------------------------------------

function log(msg: string): void {
  process.stdout.write(`[smoke] ${msg}\n`);
}

function fail(msg: string): never {
  process.stderr.write(`[smoke] FAIL: ${msg}\n`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) fail(msg);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// Auth emulator: anonymous sign-up → idToken
// ---------------------------------------------------------------------------

interface SignUpResponse {
  idToken: string;
  localId: string;
}

async function signInAnonymously(): Promise<SignUpResponse> {
  const url = `http://${EMULATOR_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FAKE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!res.ok) {
    fail(`auth signUp HTTP ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { idToken?: string; localId?: string };
  if (typeof body.idToken !== 'string' || typeof body.localId !== 'string') {
    fail(`auth signUp returned malformed body: ${JSON.stringify(body)}`);
  }
  return { idToken: body.idToken, localId: body.localId };
}

// ---------------------------------------------------------------------------
// Functions emulator: callable invocation with Bearer auth
// ---------------------------------------------------------------------------

async function callCallable<TPayload, TResult>(
  idToken: string,
  name: string,
  payload: TPayload
): Promise<TResult> {
  const url = `http://${EMULATOR_HOST}:${FUNCTIONS_PORT}/${PROJECT_ID}/${REGION}/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: payload }),
  });
  const text = await res.text();
  let parsed: unknown = {};
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      fail(`${name} returned non-JSON: ${text.slice(0, 200)}`);
    }
  }
  const body = (typeof parsed === 'object' && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  if ('error' in body) {
    fail(`${name} error: ${JSON.stringify(body['error'])}`);
  }
  if (!res.ok) {
    fail(`${name} HTTP ${res.status}: ${text}`);
  }
  if ('result' in body) return body['result'] as TResult;
  if ('data' in body) return body['data'] as TResult;
  fail(`${name} response missing result/data: ${text}`);
}

// ---------------------------------------------------------------------------
// Firestore emulator: read-only doc fetch via REST
// ---------------------------------------------------------------------------

interface FirestoreDoc {
  fields?: Record<string, unknown>;
}

async function getDoc(idToken: string, path: string): Promise<FirestoreDoc | null> {
  const url = `http://${EMULATOR_HOST}:${FIRESTORE_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) fail(`firestore GET ${path} HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as FirestoreDoc;
}

function fieldInt(doc: FirestoreDoc, field: string): number {
  const f = doc.fields?.[field] as { integerValue?: string } | undefined;
  return f?.integerValue ? Number.parseInt(f.integerValue, 10) : 0;
}

function fieldString(doc: FirestoreDoc, field: string): string {
  const f = doc.fields?.[field] as { stringValue?: string } | undefined;
  return f?.stringValue ?? '';
}

function fieldNullOrString(doc: FirestoreDoc, field: string): string | null {
  const f = doc.fields?.[field] as { stringValue?: string; nullValue?: null } | undefined;
  if (f === undefined) return null;
  if ('nullValue' in (f as object)) return null;
  return (f as { stringValue?: string }).stringValue ?? null;
}

function fieldArrayStrings(doc: FirestoreDoc, field: string): string[] {
  const f = doc.fields?.[field] as { arrayValue?: { values?: unknown[] } } | undefined;
  const vals = f?.arrayValue?.values;
  if (!Array.isArray(vals)) return [];
  return vals
    .map((v) => ((v as { stringValue?: string })?.stringValue ?? null))
    .filter((s): s is string => s !== null);
}

function fieldMapInt(doc: FirestoreDoc, mapField: string, innerField: string): number {
  const f = doc.fields?.[mapField] as { mapValue?: { fields?: Record<string, unknown> } } | undefined;
  const inner = f?.mapValue?.fields?.[innerField] as { integerValue?: string } | undefined;
  return inner?.integerValue ? Number.parseInt(inner.integerValue, 10) : 0;
}

function fieldMapBool(doc: FirestoreDoc, mapField: string, innerField: string): boolean {
  const f = doc.fields?.[mapField] as { mapValue?: { fields?: Record<string, unknown> } } | undefined;
  const inner = f?.mapValue?.fields?.[innerField] as { booleanValue?: boolean } | undefined;
  return inner?.booleanValue === true;
}

// ---------------------------------------------------------------------------
// Smoke flow
// ---------------------------------------------------------------------------

const sampleStageReward: RewardBundle = {
  gold: 100,
  ascensionCells: 1,
  xpScrollMinor: 2,
  xpScrollStandard: 0,
  xpScrollGrand: 0,
  gearIds: [],
};

async function main(): Promise<void> {
  log(`project=${PROJECT_ID} host=${EMULATOR_HOST}`);

  log('signing in anonymously…');
  const { idToken, localId } = await signInAnonymously();
  log(`uid=${localId}`);

  // 0) getOrCreatePlayer — bootstrap starter profile
  log('callable: getOrCreatePlayer');
  const playerInit = await callCallable<Record<string, never>, { player: { uid: string; goldBank: number; ownedClassIds: string[]; currentRunId: string | null }; created: boolean }>(
    idToken,
    'getOrCreatePlayer',
    {}
  );
  assertEqual(playerInit.created, true, 'getOrCreatePlayer.created on first call');
  assertEqual(playerInit.player.uid, localId, 'getOrCreatePlayer.player.uid');
  assertEqual(playerInit.player.goldBank, 0, 'initial goldBank');
  assert(
    playerInit.player.ownedClassIds.includes(STARTER_CLASS_ID),
    `starter class ${STARTER_CLASS_ID} not in ownedClassIds`
  );
  assert(playerInit.player.currentRunId === null, 'initial currentRunId should be null');

  // Idempotence check.
  const playerInit2 = await callCallable<Record<string, never>, { player: { uid: string }; created: boolean }>(
    idToken, 'getOrCreatePlayer', {}
  );
  assertEqual(playerInit2.created, false, 'getOrCreatePlayer.created on second call must be false');

  // 1) startRun
  log('callable: startRun');
  const start = await callCallable<{
    activeClassId: string;
    activeLineageId: string;
    evolutionTargetClassId: string | null;
  }, { runId: string; seed: number; activeClassId: string }>(
    idToken,
    'startRun',
    {
      activeClassId: STARTER_CLASS_ID,
      activeLineageId: STARTER_LINEAGE_ID,
      evolutionTargetClassId: EVOLUTION_TARGET_CLASS_ID,
    }
  );
  assert(typeof start.runId === 'string' && start.runId.length > 0, 'startRun returned no runId');
  assert(Number.isFinite(start.seed) && start.seed >= 0, 'startRun returned invalid seed');
  log(`runId=${start.runId} seed=${start.seed}`);

  // Player doc should now have currentRunId set.
  const playerMidRun = await getDoc(idToken, `players/${localId}`);
  assert(playerMidRun, 'player doc missing after startRun');
  assertEqual(fieldString(playerMidRun, 'currentRunId'), start.runId, 'player.currentRunId after startRun');

  // 2) submitStageOutcome stages 1..9
  for (let stage = 1; stage <= 9; stage++) {
    const res = await callCallable<unknown, { committed: boolean; nextStage: number }>(
      idToken,
      'submitStageOutcome',
      {
        runId: start.runId,
        stageIndex: stage,
        result: 'won',
        rewards: sampleStageReward,
        hpRemaining: 100,
        elapsedSeconds: 30,
      }
    );
    assertEqual(res.committed, true, `submitStageOutcome[${stage}].committed`);
    assertEqual(res.nextStage, stage + 1, `submitStageOutcome[${stage}].nextStage`);
  }
  log('submitted stages 1..9');

  // After stage 9 commits, run.stage should be 10.
  const beforeBank = await getDoc(idToken, `runs/${start.runId}`);
  assert(beforeBank, 'run doc missing before bankCheckpoint');
  assertEqual(fieldInt(beforeBank, 'stage'), 10, 'run.stage before bankCheckpoint');

  // 3) bankCheckpoint at stage 10 (vault → bank)
  log('callable: bankCheckpoint @ stage 10');
  const bank = await callCallable<{ runId: string }, { banked: RewardBundle }>(
    idToken,
    'bankCheckpoint',
    { runId: start.runId }
  );
  // 9 wins × 100 gold = 900 total. After bankCheckpoint, banked == 900.
  assertEqual(bank.banked.gold, 900, 'bank.banked.gold');
  assertEqual(bank.banked.ascensionCells, 9, 'bank.banked.ascensionCells');

  // 4) endRun (won) — vault is already empty, banked stays at 900.
  log('callable: endRun (won)');
  const end = await callCallable<
    { runId: string; finalResult: string },
    {
      settled: boolean;
      bankedRewards: RewardBundle;
      progression: {
        awardedAscensionCells: number;
        lineageRankDelta: number;
        newlyUnlockedClassIds: string[];
        playerTotals: {
          goldBank: number;
          ascensionCells: number;
          lineageRanks: Record<string, number>;
          classRanks: Record<string, number>;
        };
      };
    }
  >(
    idToken,
    'endRun',
    { runId: start.runId, finalResult: 'won' }
  );
  assertEqual(end.settled, true, 'endRun.settled');
  assertEqual(end.bankedRewards.gold, 900, 'endRun.bankedRewards.gold');

  // Progression: stageCompleted = run.stage - 1 = 10 - 1 = 9
  // ascensionCells won: 9*3+25 = 52
  const expectedCells = 9 * 3 + 25; // 52
  assertEqual(end.progression.awardedAscensionCells, expectedCells, 'progression.awardedAscensionCells');
  assertEqual(end.progression.lineageRankDelta, 1, 'progression.lineageRankDelta');
  assertEqual(end.progression.playerTotals.goldBank, 900, 'progression.playerTotals.goldBank');
  assertEqual(end.progression.playerTotals.ascensionCells, expectedCells, 'progression.playerTotals.ascensionCells');
  log(`progression: cells=${end.progression.awardedAscensionCells} rankDelta=${end.progression.lineageRankDelta}`);

  // 5) Read back run doc and verify final state.
  const runDoc = await getDoc(idToken, `runs/${start.runId}`);
  assert(runDoc, 'run doc missing after endRun');
  assertEqual(fieldString(runDoc, 'result'), 'won', 'runDoc.result');
  assertEqual(fieldMapInt(runDoc, 'bankedRewards', 'gold'), 900, 'runDoc.bankedRewards.gold');
  assertEqual(fieldMapInt(runDoc, 'vaultedRewards', 'gold'), 0, 'runDoc.vaultedRewards.gold');

  // 6) Player doc should reflect settled progression.
  const playerDoc = await getDoc(idToken, `players/${localId}`);
  assert(playerDoc, 'player doc missing after endRun');
  assertEqual(fieldInt(playerDoc, 'goldBank'), 900, 'player.goldBank after settle');
  assertEqual(fieldInt(playerDoc, 'ascensionCells'), expectedCells, 'player.ascensionCells after settle');
  assertEqual(fieldMapInt(playerDoc, 'lineageRanks', STARTER_LINEAGE_ID), 1, 'player.lineageRanks.drakehorn_forge');
  assert(
    fieldArrayStrings(playerDoc, 'ownedClassIds').includes(STARTER_CLASS_ID),
    'player.ownedClassIds still has starter'
  );
  // currentRunId must be cleared after settle.
  assert(
    fieldNullOrString(playerDoc, 'currentRunId') === null,
    'player.currentRunId should be null after endRun'
  );
  log('player doc progression verified');

  // 7) Audit trigger — wait briefly for the background trigger then verify.
  log('waiting for audit trigger…');
  let audited: FirestoreDoc | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    audited = await getDoc(idToken, `runs/${start.runId}`);
    if (audited?.fields?.['audit']) break;
  }
  assert(audited?.fields?.['audit'], 'audit field never appeared on run doc');
  assertEqual(fieldMapBool(audited, 'audit', 'ok'), true, 'audit.ok');

  // 8) Checkpoint outcome doc exists for stage 9.
  const cpDoc = await getDoc(idToken, `runs/${start.runId}/checkpoints/9`);
  assert(cpDoc, 'checkpoint doc 9 missing');
  assertEqual(fieldString(cpDoc, 'result'), 'won', 'checkpoint[9].result');

  log('OK — full lifecycle + meta-progression passed.');
}

main().catch((err: unknown) => {
  process.stderr.write(`[smoke] uncaught: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
