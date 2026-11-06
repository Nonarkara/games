// Browser regression for the homepage's decision hierarchy. Use a configured
// Playwright installation without adding a production runtime dependency.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
const base = process.env.HIERARCHY_URL || 'http://127.0.0.1:4197';
try {
 for (const width of [390,768,1024,1440]) {
  const page = await browser.newPage({viewport:{width,height:width===390?844:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base); await page.waitForSelector('.select-row'); await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   return {intro:rect('.attract-hero').height,first:rect('.select-row').top,nameBottom:rect('.select-name').bottom,primary:rect('[data-discovery=quick]').bottom,explanation:rect('.attract-line').height,title:parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),secondary:parseFloat(getComputedStyle(document.querySelector('.attract-feature-title')).fontSize),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.ok(metrics.explanation>0,'explanation cannot disappear on phones');
  assert.ok(metrics.primary<400,'quick play must be visible without scrolling');
  assert.ok(metrics.first<(width===390?844:900),'browsing starts inside first screen');
  assert.ok(metrics.nameBottom<(width===390?844:900),'a real game name, not just card chrome, must be visible');
  assert.ok(metrics.intro<400,'intro is not a second screen');
  assert.ok(metrics.title/metrics.secondary>=1.5,'headline must outrank featured title');
  assert.equal(metrics.overflow,false);
  assert.equal(await page.locator('[data-discovery=recommended]').isVisible(),false);
  await page.screenshot({path:`/tmp/hierarchy-final-${width}.png`});
  if(width===1024) {
   // Restore the legacy 540px hero floor, not a made-up failure size.
   await page.locator('.attract-hero').evaluate(e=>e.style.minHeight='540px');
   assert.ok(await page.locator('.attract-hero').evaluate(e=>e.getBoundingClientRect().height>=400),'original expanded intro must fail budget');
   await page.locator('.attract-hero').evaluate(e=>e.style.minHeight='');
  }
  await page.locator('[data-discovery=quick]').click();
  await page.locator('.briefing-play').waitFor();
  await page.locator('.game-session-bar > button').click();
  await page.locator('.discovery-options > summary').click();
  assert.ok(await page.locator('[data-discovery=recommended]').isVisible());
  assert.equal(await page.locator('[data-mood]').count(),8);
  await page.screenshot({path:`/tmp/hierarchy-expanded-${width}.png`});
  await page.locator('[data-discovery=surprise]').click();
  await page.locator('.briefing-play').waitFor();
  await page.locator('.game-session-bar > button').click();
  await page.locator('button[data-wing=labs]').click();
  assert.equal(await page.locator('button[data-wing=labs]').getAttribute('aria-pressed'),'true');
  await page.locator('#search-input').fill('pirate');
  assert.ok(await page.locator('.select-row').count()>=1);
  await page.locator('#search-input').fill('zzzzqx');
  await page.locator('.cabinet-empty').waitFor();
  await page.locator('#search-input').fill('');
  await page.evaluate(()=>{
   // Enlarge the actual decision text; changing root rem alone misses px fonts.
   const elements=[...document.querySelectorAll('.attract-copy h1,.attract-line,.attract-picks b,.attract-picks button > span,.discovery-options > summary')];
   const sizes=elements.map(e=>parseFloat(getComputedStyle(e).fontSize));
   elements.forEach((e,i)=>e.style.fontSize=`${sizes[i]*2}px`);
  });
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'enlarged text cannot overflow viewport');
  await page.screenshot({path:`/tmp/hierarchy-enlarged-${width}.png`});
  assert.deepEqual(errors,[]);
  console.log('hierarchy passes',width,JSON.stringify(metrics)); await page.close();
 }
} finally { await browser.close(); }
