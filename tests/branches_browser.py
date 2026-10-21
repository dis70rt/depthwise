"""Verify curved branches, exact active ancestry, and pan-before-expand sequencing."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('DEPTHWISE_URL', 'http://127.0.0.1:4173')
ART = Path(__file__).resolve().parents[1] / 'artifacts'
ART.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1920,'height':1080})
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(BASE+'/?example=database')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(800)
    assert page.locator('.branches text').count() == 0
    assert page.locator('.branch-line').count() == 3
    # Capture real animation frames, including the moment the preview is mounted.
    page.evaluate('''() => {
      window.branchFrames = [];
      const started = performance.now();
      const card = document.querySelector('[data-path="indexes/index.md"]');
      const button = card.querySelector('.node-toggle');
      const sample = () => {
        const box = card.getBoundingClientRect();
        branchFrames.push({t:performance.now()-started, open:button.getAttribute('aria-expanded')==='true',
          transform:document.querySelector('.transform-content').style.transform,x:box.x,y:box.y});
        if(performance.now()-started < 1400) requestAnimationFrame(sample);
      };
      sample();
      button.click();
    }''')
    page.wait_for_timeout(1500)
    frames=page.evaluate('branchFrames')
    closed=[frame for frame in frames if not frame['open']]
    opened=[frame for frame in frames if frame['open']]
    assert opened, 'Preview did not expand'
    assert len({frame['transform'] for frame in closed}) > 3, 'Canvas must move while preview stays collapsed'
    assert opened[0]['t'] >= 300, opened[0]
    # A locked reading position must survive all measured layout changes.
    assert max(abs(frame['x']-opened[0]['x']) for frame in opened) < 2
    assert max(abs(frame['y']-opened[0]['y']) for frame in opened) < 2
    assert page.locator('.branch-active').count() == 1
    assert page.locator('.node-on-path').count() == 2
    page.screenshot(path=str(ART/'branches-expanded-1920.png'))
    page.locator('[data-path="indexes/write-cost.md"] .node-toggle').click()
    page.wait_for_timeout(1100)
    assert page.locator('.branch-active').count() == 2
    assert page.locator('.node-on-path').count() == 3
    page.screenshot(path=str(ART/'branches-active-path-1920.png'))
    # A newer request supersedes a pending expansion, rather than opening both.
    page.goto(BASE+'/?example=database')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(700)
    page.evaluate('''() => {
      document.querySelector('[data-path="indexes/index.md"] .node-toggle').click();
      document.querySelector('[data-path="transactions/index.md"] .node-toggle').click();
    }''')
    page.wait_for_timeout(1100)
    expect(page.locator('[data-path="indexes/index.md"] .node-toggle')).to_have_attribute('aria-expanded','false')
    expect(page.locator('[data-path="transactions/index.md"] .node-toggle')).to_have_attribute('aria-expanded','true')
    # Immediate reduced-motion state, with no connector drawing animation.
    page.emulate_media(reduced_motion='reduce')
    page.locator('[data-path="indexes/index.md"] .node-toggle').focus()
    page.keyboard.press('Enter')
    expect(page.locator('[data-path="indexes/index.md"] .node-toggle')).to_have_attribute('aria-expanded','true')
    assert page.locator('.branch-line').first.evaluate('(n)=>getComputedStyle(n).animationName') == 'none'
    for width,height in [(1440,900),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(BASE+'/?example=database')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(600)
        page.locator('[data-path="indexes/index.md"] .node-toggle').focus()
        page.keyboard.press('Enter')
        page.wait_for_timeout(700)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(ART/f'branches-{width}.png'))
    assert not errors,errors
    result={'result':'passed','first_expansion_ms':round(opened[0]['t']), 'moving_frames_before_expansion':len(closed), 'browser_errors':errors}
    (ART/'branches-results.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
    browser.close()
