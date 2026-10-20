"""Inspect the reading interface at 100% scale, including a 24-inch 1080p layout."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:4173')
ART=Path(__file__).resolve().parents[1]/'artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROME_PATH','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    results=[]
    for width,height in [(1920,1080),(1440,900),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(BASE+'/?example=database')
        page.wait_for_load_state('networkidle')
        page.evaluate('document.fonts.ready')
        expect(page.locator('.file-node')).to_have_count(4)
        page.wait_for_timeout(700)
        metrics=page.evaluate('''() => {
            const css = selector => { const style=getComputedStyle(document.querySelector(selector)); return { size:parseFloat(style.fontSize),family:style.fontFamily,lineHeight:parseFloat(style.lineHeight) }; };
            return { question:css('.node-toggle'),body:css('.markdown'),outline:css('.heading-list a'),loaded:document.fonts.check('18px "Atkinson Hyperlegible Next Variable"'),overflow:document.documentElement.scrollWidth>innerWidth };
        }''')
        assert metrics['loaded']
        assert 'Atkinson Hyperlegible Next' in metrics['question']['family']
        assert metrics['question']['size'] >= (17 if width<760 else 18)
        assert metrics['body']['size'] >= (17 if width<760 else 18)
        assert metrics['outline']['size'] >= 16
        assert not metrics['overflow']
        page.screenshot(path=str(ART/f'readability-{width}.png'))
        if width==1920:
            page.locator('.file-node[data-path="indexes/index.md"] .node-toggle').click()
            page.wait_for_timeout(900)
            expect(page.locator('.file-node')).to_have_count(7)
            page.screenshot(path=str(ART/'readability-expanded-1920.png'))
        results.append({'width':width,'height':height,**metrics})
    assert not errors,errors
    (ART/'readability-results.json').write_text(json.dumps(results,indent=2))
    print(json.dumps(results,indent=2))
    browser.close()
