// Supply a local Playwright install via PARTY_PLAYWRIGHT when not installed here.
const { chromium } = await import(process.env.PARTY_PLAYWRIGHT || 'playwright-core');
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const base = process.env.PARTY_URL || 'http://127.0.0.1:4191';
for (const width of [390,768,1024,1280,1440]) {
 const page = await browser.newPage({viewport:{width,height:width===390?844:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base); await page.waitForSelector('.select-row');
 for(const pirate of [false,true]) {
  await page.goto(`${base}/?game=${pirate?'pirate-barrel':'russian-roulette'}`);
  await page.locator('.briefing-play').click();
  for(const players of [2,10]) {
   await page.selectOption('[name=players]',String(players)); await page.selectOption('[name=effect]','pop');
   await page.locator('[type=submit]').click();
   const geometry = await page.evaluate(pirate=>{
    const status=document.querySelector('.chance-status').getBoundingClientRect();
    const action=document.querySelector(pirate?'[data-slot]':'[data-trigger]').getBoundingClientRect();
    return {gap:action.top-status.bottom, bottom:action.bottom,height:innerHeight};
   },pirate);
   assert.ok(geometry.gap<=180 && geometry.bottom<=geometry.height,'turn and action stay together above fold');
   await page.locator('[data-stage]').evaluate(el=>el.style.minHeight='900px');
   const oversized=await page.evaluate(pirate=>document.querySelector(pirate?'[data-slot]':'[data-trigger]').getBoundingClientRect().bottom>innerHeight,pirate);
   assert.ok(oversized,'oversized working region must fail same first-screen budget');
   await page.locator('[data-stage]').evaluate(el=>el.style.minHeight='');
   await page.screenshot({path:`/tmp/party-active-${pirate?'pirate':'roulette'}-${width}.png`});
   let turns=0;
   while(await page.locator('[data-again]').isHidden()) {
    if(pirate) await page.locator('[data-slot]:not(:disabled)').first().click(); else await page.locator('[data-trigger]').click();
    turns++; assert.ok(turns<=players*3);
    if(await page.locator('[data-next]').isVisible()) await page.locator('[data-next]').click();
   }
   assert.match(await page.locator('.chance-status').textContent(),/loses/);
   const box=await page.locator('[data-again]').boundingBox(); assert.ok(box.y+box.height<= (width===390?844:900),'action fits viewport');
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,bad:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).slice(0,12).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right])}));
   if(overflow.scroll>overflow.width) console.log('OVERFLOW',pirate,players,overflow);
   assert.equal(overflow.scroll<=overflow.width,true);
   await page.screenshot({path:`/tmp/party-${pirate?'pirate':'roulette'}-${width}.png`});
   await page.locator('[data-again]').click();
  }
  await page.goto(base); await page.waitForSelector('.select-row');
 }
 assert.deepEqual(errors,[]); await page.close(); console.log('party browser passes',width);
}
await browser.close();
