import { processVoiceSupportTurn } from '../src/pipeline';
import { SupportedLanguage } from '../src/types';

async function runTestScenario(name: string, fn: () => Promise<void>) {
  console.log(`\n======================================================`);
  console.log(`▶ TEST SCENARIO: ${name}`);
  console.log(`======================================================`);
  try {
    const t0 = Date.now();
    await fn();
    console.log(`✅ [PASSED] (${Date.now() - t0}ms)`);
  } catch (err: any) {
    console.error(`❌ [FAILED]: ${err.message}`);
  }
}

async function main() {
  console.log('🐝 Starting "Talk to HoneyChain" Automated Test Suite...');

  // Test 1: English Hive Weight Question
  await runTestScenario('English Query - Hive Weight & Telemetry', async () => {
    const res = await processVoiceSupportTurn({
      textQuery: 'What is the current weight of my hives and how are the sensors doing?',
      language: 'en-IN',
      uid: 'test_beekeeper_01',
    });

    console.log(`Transcript: "${res.transcript}"`);
    console.log(`Answer: "${res.answerText}"`);
    console.log(`Citations: ${JSON.stringify(res.citations)}`);
    console.log(`Latencies: STT=${res.metrics.sttLatencyMs}ms, Context=${res.metrics.userContextLatencyMs}ms, RAG=${res.metrics.ragLatencyMs}ms, LLM=${res.metrics.llmLatencyMs}ms, TTS=${res.metrics.ttsLatencyMs}ms, Total=${res.metrics.totalLatencyMs}ms`);
    if (!res.answerText) throw new Error('Answer was empty');
  });

  // Test 2: Kannada Query - Honey Harvesting & Moisture
  await runTestScenario('Kannada Query - ಜೇನು ಇಳುವರಿ ಮತ್ತು ತೇವಾಂಶ', async () => {
    const res = await processVoiceSupportTurn({
      textQuery: 'ಜೇನುತುಪ್ಪ ಯಾವಾಗ ಕಟಾವು ಮಾಡಬೇಕು ಮತ್ತು ಸರಿಯಾದ ತೇವಾಂಶ ಎಷ್ಟು ಇರಬೇಕು?',
      language: 'kn-IN',
      uid: 'test_beekeeper_02',
    });

    console.log(`Transcript: "${res.transcript}"`);
    console.log(`Answer: "${res.answerText}"`);
    console.log(`Citations: ${JSON.stringify(res.citations)}`);
    console.log(`Total Latency: ${res.metrics.totalLatencyMs}ms`);
    if (!res.answerText) throw new Error('Answer was empty');
  });

  // Test 3: Hindi Query - Government Beekeeping Subsidies
  await runTestScenario('Hindi Query - सरकारी मधुमक्खी पालन योजना और सब्सिडी', async () => {
    const res = await processVoiceSupportTurn({
      textQuery: 'मधुमक्खी बक्से और उपकरण के लिए सरकारी सब्सिडी कैसे मिलती है?',
      language: 'hi-IN',
      uid: 'test_beekeeper_03',
    });

    console.log(`Transcript: "${res.transcript}"`);
    console.log(`Answer: "${res.answerText}"`);
    console.log(`Citations: ${JSON.stringify(res.citations)}`);
    console.log(`Total Latency: ${res.metrics.totalLatencyMs}ms`);
    if (!res.answerText) throw new Error('Answer was empty');
  });

  // Test 4: Empty / Unintelligible Audio handling
  await runTestScenario('Empty Audio / Unintelligible Silence', async () => {
    const emptyBuffer = Buffer.from(new Uint8Array(20));
    const res = await processVoiceSupportTurn({
      audioBuffer: emptyBuffer,
      mimeType: 'audio/m4a',
      language: 'kn-IN',
      uid: 'test_beekeeper_04',
    });

    console.log(`Transcript: "${res.transcript}"`);
    console.log(`Answer: "${res.answerText}"`);
    if (res.transcript !== '[unintelligible]') {
      throw new Error(`Expected [unintelligible], got: ${res.transcript}`);
    }
  });

  // Test 5: Out of Scope / Insufficient Knowledge with Escalation
  await runTestScenario('Unanswered Question with Human Support Flagging', async () => {
    const res = await processVoiceSupportTurn({
      textQuery: 'Can I feed honey bees milk and bread with antibiotics?',
      language: 'en-IN',
      uid: 'test_beekeeper_05',
    });

    console.log(`Transcript: "${res.transcript}"`);
    console.log(`Answer: "${res.answerText}"`);
    console.log(`Needs Human Support: ${res.needsHumanSupport}`);
  });

  console.log('\n🎉 All test scenarios finished.');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

