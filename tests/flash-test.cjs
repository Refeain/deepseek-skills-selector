const { chromium } = require('C:/Users/YYT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve(__dirname, '../output');
const statePath = path.join(output, 'harness-skills-browser-state.json');

async function openPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 820 },
    ...(fs.existsSync(statePath) ? { storageState: statePath } : {})
  });
  const page = await context.newPage();
  await page.goto(process.env.HARNESS_QA_URL);
  await page.waitForTimeout(1600);
  const notice = page.getByRole('button', { name: '继续', exact: true });
  if (await notice.isVisible()) await notice.click();
  const welcome = page.getByRole('heading', { name: '开始使用', exact: true });
  if (await welcome.isVisible()) await page.getByRole('button', { name: '关闭', exact: true }).click();
  return { context, page };
}

async function recordOpen(page) {
  await page.evaluate(() => {
    window.__frames = [];
    let count = 0;
    const tick = () => {
      const panel = document.querySelector('.dss-panel');
      if (panel) {
        const style = getComputedStyle(panel);
        const rect = panel.getBoundingClientRect();
        window.__frames.push({
          t: Math.round(performance.now()),
          visibility: style.visibility,
          y: Math.round(rect.y * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          text: (panel.innerText || '').replace(/\s+/g, ' ').slice(0, 24)
        });
      }
      if (count++ < 150) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.getByRole('button', { name: '技能', exact: true }).click();
  await page.waitForTimeout(500);
  return page.evaluate(() => window.__frames);
}

function summarize(frames) {
  const firstVisible = frames.find(frame => frame.visibility === 'visible');
  const visible = frames.filter(frame => frame.visibility === 'visible');
  const distinct = [...new Set(visible.map(frame => `${frame.y}/${frame.height}`))];
  return { firstVisible, visible: visible.length, distinct, sample: frames.slice(0, 12) };
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const { context, page } = await openPage(browser);
    const frames = await recordOpen(page);
    const summary = summarize(frames);
    console.log(JSON.stringify(summary, null, 2));
    assert.ok(summary.firstVisible, 'panel never became visible');
    const first = summary.firstVisible;
    assert.ok(Math.abs(first.y - 73) <= 1.5, `first visible panel at y=${first.y}, expected 73`);
    assert.ok(Math.abs(first.height - 400) <= 1.5, `first visible panel height=${first.height}, expected 400`);
    assert.equal(summary.distinct.length, 1, `visible panel moved: ${summary.distinct.join(', ')}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const second = summarize(await recordOpen(page));
    console.log('SECOND OPEN', JSON.stringify(second, null, 2));
    assert.ok(second.firstVisible, 'panel did not reopen');
    assert.ok(Math.abs(second.firstVisible.y - 73) <= 1.5, `second open first y=${second.firstVisible.y}`);
    assert.equal(second.distinct.length, 1, `second open moved: ${second.distinct.join(', ')}`);
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });