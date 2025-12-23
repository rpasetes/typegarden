// Tutorial Flow E2E Test
// Tests the complete tutorial flow: intro → mechanics (with green letter) → fever (with streak)
//
// To run this test:
// 1. Start dev server: bun run dev
// 2. Start dev-browser server: cd ~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/*/skills/dev-browser && ./server.sh
// 3. Run from dev-browser dir: cd ~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/*/skills/dev-browser && bun x tsx /path/to/tests/tutorial-flow.test.ts

import { connect, waitForPageLoad } from "@/client.js";

// Realistic typing speed (~80 WPM = ~6.6 chars/sec = ~150ms per char)
const TYPING_DELAY = 40;  // Fast but not superhuman
const WORD_DELAY = 80;    // Pause between words

async function typeText(page: any, text: string) {
  for (const word of text.split(' ')) {
    for (const char of word) {
      await page.keyboard.type(char, { delay: TYPING_DELAY });
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(WORD_DELAY);
  }
}

async function runTest() {
  const client = await connect();
  const page = await client.page("main");
  await page.setViewportSize({ width: 1280, height: 800 });

  // Clear and reload
  await page.goto("http://localhost:5173");
  await waitForPageLoad(page);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await waitForPageLoad(page);
  await page.waitForTimeout(500);

  // Type intro
  console.log("Typing intro...");
  await typeText(page, "welcome to typegarden, a game that grows the more you type: handcrafted by russell antonie pasetes.");
  await page.waitForTimeout(2500);
  console.log("✓ Intro complete");

  // Type mechanics up to "special" (not including "!")
  console.log("Typing mechanics...");
  await typeText(page, "every correct word you type gains you more sol. think of it as sunlight for your garden. you are free to make any mistakes, as long as you keep moving forward. over time you will notice golden letters appear as you type. catch them in time to gain a sol burst. stay in flow and you will catch more golden letters. sometimes, rarer characters appear that are different from the usual golden letter. type them to trigger something");

  // Type "special" character by character, then pause before "!"
  for (const char of "special") {
    await page.keyboard.type(char, { delay: TYPING_DELAY });
  }

  // Wait for green "!" to be visible
  await page.waitForTimeout(800);
  await page.screenshot({ path: "tmp/test-green-visible.png" });

  const hasGreen = await page.evaluate(() => {
    const greenChar = document.querySelector('.char.green');
    return greenChar !== null;
  });
  console.log(`✓ Green "!" visible before typing: ${hasGreen}`);

  // Check streak is NOT visible during mechanics
  const streakDuringMechanics = await page.evaluate(() => {
    const counter = document.querySelector('.chain-counter');
    return counter?.classList.contains('visible') ?? false;
  });
  console.log(`✓ Streak hidden during mechanics: ${!streakDuringMechanics}`);

  // Type "!" to capture green and transition to fever
  await page.keyboard.type('!', { delay: TYPING_DELAY });
  await page.keyboard.press('Space');

  // Wait for transition to fever
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "tmp/test-fever-start.png" });

  // Type some of fever mode
  console.log("Typing fever mode...");
  await typeText(page, "yooo welcome to fever mode lmao every letter is golden now");

  // Check streak visibility and value
  const streakVisible = await page.evaluate(() => {
    const counter = document.querySelector('.chain-counter');
    return counter?.classList.contains('visible') ?? false;
  });
  const streakValue = await page.evaluate(() => {
    const counter = document.querySelector('.chain-counter');
    return counter?.textContent ?? '';
  });

  await page.screenshot({ path: "tmp/test-fever-streak.png" });

  console.log(`✓ Streak visible in fever: ${streakVisible}`);
  console.log(`✓ Streak value: ${streakValue}`);
  console.log("");

  // Test assertions
  const passed = hasGreen && !streakDuringMechanics && streakVisible;
  console.log(passed ? "✅ ALL TESTS PASSED" : "❌ TESTS FAILED");

  await client.disconnect();
  return passed;
}

runTest().catch(console.error);
