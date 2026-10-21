"""Workspace context belongs in the app header; focused files clear the controls."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:4173')
ART=Path(__file__).resolve().parents[1]/'artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='depthwise-header-') as temp:
    browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    results=[]
    for width,height in [(1920,1080),(1440,900),(1280,720),(768,844),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(BASE+'/?example=database')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        expect(page.locator('.app-header .folder-caption')).to_contain_text('database-preparation')
        expect(page.locator('.tree-workspace .workspace-caption')).to_have_count(0)
        expect(page.locator('.tree-workspace .tree-hint')).to_have_count(0)
        expect(page.get_by_role('heading',name='Question tree',exact=True)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        for path in ['index.md','indexes/index.md']:
            if path!='index.md':
                page.locator(f'[data-path="{path}"] .node-toggle').evaluate('(button)=>button.click()')
                expect(page.locator(f'[data-path="{path}"] .node-toggle')).to_have_attribute('aria-expanded','true')
                page.wait_for_timeout(900)
            bounds=page.evaluate('''(path)=>{
                const node=document.querySelector(`[data-path="${path}"]`).getBoundingClientRect();
                const controls=document.querySelector('.canvas-bottom').getBoundingClientRect();
                const header=document.querySelector('.app-header').getBoundingClientRect();
                return {top:node.top,bottom:node.bottom,controlsTop:controls.top,headerBottom:header.bottom};
            }''',path)
            assert bounds['top']>=bounds['headerBottom']+16,bounds
            assert bounds['top']<=bounds['headerBottom']+40,bounds
            assert bounds['bottom']<=bounds['controlsTop']-8,bounds
            results.append({'width':width,'path':path,**bounds})
        if width<=1100:
            page.get_by_role('button',name='Outline',exact=True).click()
            expect(page.get_by_role('dialog',name='Document outline')).to_be_visible()
            page.keyboard.press('Escape')
        page.screenshot(path=str(ART/f'header-workspace-{width}.png'))
    # The reading surface scrolls instead of growing behind the controls.
    folder=Path(temp)/'long-pack'
    folder.mkdir()
    (folder/'index.md').write_text('# How does a long document stay readable?\n\n'+('\n\nA paragraph with detail and explanations.'*250))
    page.set_viewport_size({'width':1280,'height':720})
    page.locator('input[type=file]').set_input_files(str(folder))
    expect(page.locator('.app-header .folder-caption')).to_contain_text('long-pack')
    page.wait_for_timeout(1200)
    preview=page.locator('.preview')
    assert preview.evaluate('(n)=>n.scrollHeight>n.clientHeight+100')
    card=page.locator('.file-node').bounding_box()
    controls=page.locator('.canvas-bottom').bounding_box()
    assert card['y']+card['height']<=controls['y']-8
    assert not errors,errors
    print(json.dumps({'result':'passed','bounds':results,'browser_errors':errors},indent=2))
    browser.close()
