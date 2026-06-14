/**
 * Emulator end-to-end smoke for the MVP run lifecycle + meta-progression.
 *
 * Drives:
 *   getOrCreatePlayer
 *   → startRun
 *   → submitStageOutcome ×9
 *   → bankCheckpoint @ stage 10
 *   → endRun (won)
 *   → startRun
 *   → submitStageOutcome @ stage 1
 *   → endRun (fled)
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
const STARTER_CORP_ID = 'drakehorn_forge';
// T2 evolution target (set by client at startRun; computed from content).
// For the smoke test we just pass null since the server doesn't validate the value itself.
const EVOLUTION_TARGET_SPEC_ID: string | null = null;

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
  credits: 100,
  quantumCores: 1,
  scrap: 0,
  dataCacheMinor: 2,
  dataCacheStandard: 0,
  dataCacheGrand: 0,
  gearIds: [],
};

function expectedStageBanked(reward: RewardBundle, streakBeforeWin: number): { credits: number; quantumCores: number } {
  const baselineCredits = Math.floor(reward.credits * 0.3);
  const baselineCores = Math.floor(reward.quantumCores * 0.3);
  const vaultedCredits = reward.credits - baselineCredits;
  const vaultedCores = reward.quantumCores - baselineCores;
  const multiplier = Math.min(1 + streakBeforeWin * 0.2, 3);

  return {
    credits: baselineCredits + Math.floor(vaultedCredits * multiplier),
    quantumCores: baselineCores + Math.floor(vaultedCores * multiplier),
  };
}

function expectedBankedAfterWins(
  reward: RewardBundle,
  wonStages: number,
): { credits: number; quantumCores: number } {
  let credits = 0;
  let quantumCores = 0;
  for (let i = 0; i < wonStages; i++) {
    const stage = expectedStageBanked(reward, i);
    credits += stage.credits;
    quantumCores += stage.quantumCores;
  }
  return { credits, quantumCores };
}

async function main(): Promise<void> {
  log(`project=${PROJECT_ID} host=${EMULATOR_HOST}`);

  log('signing in anonymously…');
  const { idToken, localId } = await signInAnonymously();
  log(`uid=${localId}`);

  // 0) getOrCreatePlayer — bootstrap starter profile
  log('callable: getOrCreatePlayer');
  const playerInit = await callCallable<Record<string, never>, { player: { uid: string; credits: number; unlockedSpecIds: string[]; currentRunId: string | null }; created: boolean }>(
    idToken,
    'getOrCreatePlayer',
    {}
  );
  assertEqual(playerInit.created, true, 'getOrCreatePlayer.created on first call');
  assertEqual(playerInit.player.uid, localId, 'getOrCreatePlayer.player.uid');
  assertEqual(playerInit.player.credits, 0, 'initial credits');
  assert(
    playerInit.player.unlockedSpecIds.includes(STARTER_CLASS_ID),
    `starter class ${STARTER_CLASS_ID} not in unlockedSpecIds`
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
    activeCorpId: string;
    evolutionTargetSpecId: string | null;
  }, { runId: string; seed: number; activeClassId: string }>(
    idToken,
    'startRun',
    {
      activeClassId: STARTER_CLASS_ID,
      activeCorpId: STARTER_CORP_ID,
      evolutionTargetSpecId: EVOLUTION_TARGET_SPEC_ID,
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
  const expectedBankedAfter9Wins = expectedBankedAfterWins(sampleStageReward, 9);
  assertEqual(bank.banked.credits, expectedBankedAfter9Wins.credits, 'bank.banked.credits');
  assertEqual(bank.banked.quantumCores, expectedBankedAfter9Wins.quantumCores, 'bank.banked.quantumCores');

  // 4) endRun (won) — vault is already empty, banked remains unchanged.
  log('callable: endRun (won)');
  const end = await callCallable<
    { runId: string; finalResult: string },
    {
      settled: boolean;
      bankedRewards: RewardBundle;
      progression: {
        awardedQuantumCores: number;
        corpRankDelta: number;
        newlyUnlockedSpecIds: string[];
        playerTotals: {
          credits: number;
          quantumCores: number;
          corpRanks: Record<string, number>;
          specRanks: Record<string, number>;
        };
      };
      settlementLedger: {
        finalResult: 'won' | 'lost' | 'fled';
        preSettleBanked: RewardBundle;
        preSettleVaulted: RewardBundle;
        vaultDisposition: 'merged' | 'forfeited';
        vaultedTransferredToBank: RewardBundle;
        vaultForfeited: RewardBundle;
        postSettleBanked: RewardBundle;
      };
    }
  >(
    idToken,
    'endRun',
    { runId: start.runId, finalResult: 'won' }
  );
  assertEqual(end.settled, true, 'endRun.settled');
  assertEqual(end.bankedRewards.credits, expectedBankedAfter9Wins.credits, 'endRun.bankedRewards.credits');
  assertEqual(end.settlementLedger.finalResult, 'won', 'endRun.settlementLedger.finalResult');
  assertEqual(end.settlementLedger.vaultDisposition, 'merged', 'endRun.settlementLedger.vaultDisposition');
  assertEqual(
    end.settlementLedger.postSettleBanked.credits,
    expectedBankedAfter9Wins.credits,
    'endRun.settlementLedger.postSettleBanked.credits'
  );
  assertEqual(end.settlementLedger.vaultForfeited.credits, 0, 'endRun.settlementLedger.vaultForfeited.credits');

  // Progression: stageCompleted = run.stage - 1 = 10 - 1 = 9
  // quantumCores won: 9*3+25 = 52
  const expectedCores = 9 * 3 + 25; // 52
  const expectedCoresAfterWon = expectedBankedAfter9Wins.quantumCores + expectedCores;
  assertEqual(end.progression.awardedQuantumCores, expectedCores, 'progression.awardedQuantumCores');
  assertEqual(end.progression.corpRankDelta, 1, 'progression.corpRankDelta');
  assertEqual(
    end.progression.playerTotals.credits,
    expectedBankedAfter9Wins.credits,
    'progression.playerTotals.credits'
  );
  assertEqual(
    end.progression.playerTotals.quantumCores,
    expectedCoresAfterWon,
    'progression.playerTotals.quantumCores'
  );
  log(`progression: cores=${end.progression.awardedQuantumCores} rankDelta=${end.progression.corpRankDelta}`);

  // 5) Read back run doc and verify final state.
  const runDoc = await getDoc(idToken, `runs/${start.runId}`);
  assert(runDoc, 'run doc missing after endRun');
  assertEqual(fieldString(runDoc, 'result'), 'won', 'runDoc.result');
  assertEqual(
    fieldMapInt(runDoc, 'bankedRewards', 'credits'),
    expectedBankedAfter9Wins.credits,
    'runDoc.bankedRewards.credits'
  );
  assertEqual(fieldMapInt(runDoc, 'vaultedRewards', 'credits'), 0, 'runDoc.vaultedRewards.credits');

  // 6) Player doc should reflect settled progression.
  const playerDoc = await getDoc(idToken, `players/${localId}`);
  assert(playerDoc, 'player doc missing after endRun');
  assertEqual(fieldInt(playerDoc, 'credits'), expectedBankedAfter9Wins.credits, 'player.credits after settle');
  assertEqual(fieldInt(playerDoc, 'quantumCores'), expectedCoresAfterWon, 'player.quantumCores after settle');
  assertEqual(fieldMapInt(playerDoc, 'corpRanks', STARTER_CORP_ID), 1, 'player.corpRanks.drakehorn_forge');
  assert(
    fieldArrayStrings(playerDoc, 'unlockedSpecIds').includes(STARTER_CLASS_ID),
    'player.unlockedSpecIds still has starter'
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

  // 9) Start another run and verify fled keeps vaulted rewards.
  log('callable: startRun (fled path validation)');
  const fledStart = await callCallable<{
    activeClassId: string;
    activeCorpId: string;
    evolutionTargetSpecId: string | null;
  }, { runId: string; seed: number; activeClassId: string }>(
    idToken,
    'startRun',
    {
      activeClassId: STARTER_CLASS_ID,
      activeCorpId: STARTER_CORP_ID,
      evolutionTargetSpecId: EVOLUTION_TARGET_SPEC_ID,
    }
  );
  assert(typeof fledStart.runId === 'string' && fledStart.runId.length > 0, 'fled-path startRun runId');

  const stage1 = await callCallable<unknown, { committed: boolean; nextStage: number }>(
    idToken,
    'submitStageOutcome',
    {
      runId: fledStart.runId,
      stageIndex: 1,
      result: 'won',
      rewards: sampleStageReward,
      hpRemaining: 100,
      elapsedSeconds: 25,
    }
  );
  assertEqual(stage1.committed, true, 'fled-path submitStageOutcome.committed');
  assertEqual(stage1.nextStage, 2, 'fled-path submitStageOutcome.nextStage');

  const fledEnd = await callCallable<
    { runId: string; finalResult: string },
    {
      settled: boolean;
      bankedRewards: RewardBundle;
      progression: {
        awardedQuantumCores: number;
        corpRankDelta: number;
        playerTotals: {
          credits: number;
          quantumCores: number;
          corpRanks: Record<string, number>;
        };
      };
      settlementLedger: {
        finalResult: 'won' | 'lost' | 'fled';
        preSettleBanked: RewardBundle;
        preSettleVaulted: RewardBundle;
        vaultDisposition: 'merged' | 'forfeited';
        vaultedTransferredToBank: RewardBundle;
        vaultForfeited: RewardBundle;
        postSettleBanked: RewardBundle;
      };
    }
  >(
    idToken,
    'endRun',
    { runId: fledStart.runId, finalResult: 'fled' }
  );

  const expectedFledStage1Banked = expectedStageBanked(sampleStageReward, 0);
  const expectedPlayerCreditsAfterFled = expectedBankedAfter9Wins.credits + expectedFledStage1Banked.credits;
  const expectedPlayerCoresAfterFled = expectedCoresAfterWon + expectedFledStage1Banked.quantumCores + 1;

  // Stage-1 reward split has no streak bonus; fled settlement merges vault into bank.
  assertEqual(fledEnd.settled, true, 'fled-endRun.settled');
  assertEqual(fledEnd.bankedRewards.credits, expectedFledStage1Banked.credits, 'fled-endRun.bankedRewards.credits');
  assertEqual(fledEnd.progression.awardedQuantumCores, 1, 'fled-endRun.progression.awardedQuantumCores');
  assertEqual(fledEnd.progression.corpRankDelta, 0, 'fled-endRun.progression.corpRankDelta');
  assertEqual(fledEnd.settlementLedger.finalResult, 'fled', 'fled settlementLedger.finalResult');
  assertEqual(fledEnd.settlementLedger.preSettleBanked.credits, 30, 'fled settlementLedger.preSettleBanked.credits');
  assertEqual(fledEnd.settlementLedger.preSettleVaulted.credits, 70, 'fled settlementLedger.preSettleVaulted.credits');
  assertEqual(fledEnd.settlementLedger.vaultDisposition, 'merged', 'fled settlementLedger.vaultDisposition');
  assertEqual(fledEnd.settlementLedger.vaultedTransferredToBank.credits, 70, 'fled settlementLedger.vaultedTransferredToBank.credits');
  assertEqual(fledEnd.settlementLedger.vaultForfeited.credits, 0, 'fled settlementLedger.vaultForfeited.credits');
  assertEqual(
    fledEnd.settlementLedger.postSettleBanked.credits,
    expectedFledStage1Banked.credits,
    'fled settlementLedger.postSettleBanked.credits'
  );

  const fledRunDoc = await getDoc(idToken, `runs/${fledStart.runId}`);
  assert(fledRunDoc, 'fled-path run doc missing after endRun');
  assertEqual(fieldString(fledRunDoc, 'result'), 'lost', 'fled-path runDoc.result');
  assertEqual(
    fieldMapInt(fledRunDoc, 'bankedRewards', 'credits'),
    expectedFledStage1Banked.credits,
    'fled-path runDoc.bankedRewards.credits'
  );
  assertEqual(fieldMapInt(fledRunDoc, 'vaultedRewards', 'credits'), 0, 'fled-path runDoc.vaultedRewards.credits');

  const playerAfterFled = await getDoc(idToken, `players/${localId}`);
  assert(playerAfterFled, 'player doc missing after fled settle');
  assertEqual(fieldInt(playerAfterFled, 'credits'), expectedPlayerCreditsAfterFled, 'player.credits after fled settle');
  assertEqual(
    fieldInt(playerAfterFled, 'quantumCores'),
    expectedPlayerCoresAfterFled,
    'player.quantumCores after fled settle'
  );
  assertEqual(fieldMapInt(playerAfterFled, 'corpRanks', STARTER_CORP_ID), 1, 'player.corpRanks rank unchanged on fled');
  assert(fieldNullOrString(playerAfterFled, 'currentRunId') === null, 'player.currentRunId null after fled settle');

  log('OK — won + fled settlement lifecycle checks passed.');
}

main().catch((err: unknown) => {
  process.stderr.write(`[smoke] uncaught: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
