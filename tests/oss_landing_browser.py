"""Copyable install/prompt blocks, project explanations, and landing navigation."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:4173')
ART=Path(__file__).resolve().parents[1]/'artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},permissions=['clipboard-read','clipboard-write'])
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.evaluate('document.fonts.ready')
    page.evaluate('document.querySelector(".landing-tree").getAnimations({subtree:true}).forEach(a=>a.pause())')
    install=page.get_by_role('button',name='Copy install the authoring skill',exact=True)
    install.click()
    expect(install).to_contain_text('Copied')
    assert page.evaluate('navigator.clipboard.readText()')=='npx skills add dis70rt/depthwise'
    page.screenshot(path=str(ART/'oss-landing-hero-1440.png'))
    page.get_by_role('link',name='The project',exact=True).click()
    expect(page.get_by_role('heading',name='Your ideas have branches.')).to_be_in_viewport()
    assert page.locator('.main-empty').evaluate('(n)=>n.scrollTop')>300
    page.screenshot(path=str(ART/'oss-landing-project-1440.png'))
    page.get_by_role('link',name='The skill',exact=True).click()
    expect(page.get_by_role('heading',name='A skill for your agent.')).to_be_in_viewport()
    prompt=page.get_by_role('button',name='Copy start with your own prompt',exact=True)
    prompt.click()
    expect(prompt).to_contain_text('Copied')
    copied=page.evaluate('navigator.clipboard.readText()')
    assert copied.startswith('Use depthwise-question-tree') and '[my topic, idea, or project]' in copied
    assert page.get_by_role('link',name='Read the skill on GitHub').get_attribute('href')=='https://github.com/dis70rt/depthwise/tree/main/skills/depthwise-question-tree'
    page.screenshot(path=str(ART/'oss-landing-skill-1440.png'))
    # Clipboard rejection must select the text, not claim it copied successfully.
    page.evaluate("() => { navigator.clipboard.writeText=async()=>{throw new Error('Clipboard unavailable')}; }")
    install.click()
    expect(page.locator('.copy-feedback')).to_contain_text('Text selected')
    assert page.evaluate('getSelection().toString()')=='npx skills add dis70rt/depthwise'
    # Direct download remains available without an agent installation.
    response=context.request.get(BASE+'/depthwise-question-tree-SKILL.md')
    assert response.ok and 'name: depthwise-question-tree' in response.text()
    for width,height in [(1920,1080),(768,900),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(BASE)
        page.wait_for_load_state('networkidle')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(ART/f'oss-landing-{width}.png'))
        page.get_by_role('heading',name='A skill for your agent.').scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if width==390: page.screenshot(path=str(ART/'oss-landing-skill-390.png'))
    # Existing example entry still opens the actual workspace.
    page.get_by_role('button',name='Or explore an example tree').click()
    expect(page.locator('.app-header .folder-caption')).to_contain_text('database-preparation')
    expect(page.locator('.file-node')).to_have_count(4)
    assert not errors,errors
    print(json.dumps({'result':'passed','flows':['install copy','prompt copy','clipboard failure','anchor scrolling','GitHub links','skill download','responsive sections','example entry'],'browser_errors':errors}))
    browser.close()
