"""Review aligned landing composition and the reversible tree demonstration."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:4173')
ART=Path(__file__).resolve().parents[1]/'artifacts'
ART.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.evaluate('document.fonts.ready')
    figure=page.locator('.landing-tree')
    expect(figure).to_be_visible()
    intro=page.locator('.empty-intro').bounding_box()
    tree=figure.bounding_box()
    assert tree['x'] > intro['x']+intro['width']+20
    assert abs(tree['y']+tree['height']/2-intro['y']-intro['height']/2)<2
    expect(figure.get_by_role('button')).to_have_count(0)
    page.evaluate('document.querySelector(".landing-tree").getAnimations({subtree:true}).forEach(a=>a.pause())')
    def seek(ms):
        page.evaluate('(ms)=>document.querySelector(".landing-tree").getAnimations({subtree:true}).forEach(a=>a.currentTime=ms)',ms)
        page.wait_for_timeout(40)
        return page.evaluate('''()=>({camera:getComputedStyle(document.querySelector('.demo-camera')).transform,
          height:parseFloat(getComputedStyle(document.querySelector('.demo-selected-surface')).height),
          body:parseFloat(getComputedStyle(document.querySelector('.demo-markdown')).opacity),
          children:parseFloat(getComputedStyle(document.querySelector('.demo-deeper-questions')).opacity),
          secondHeight:parseFloat(getComputedStyle(document.querySelector('.demo-second-surface')).height),
          secondBody:parseFloat(getComputedStyle(document.querySelector('.demo-second-markdown')).opacity),
          finalChildren:parseFloat(getComputedStyle(document.querySelector('.demo-final-questions')).opacity)})''')
    start=seek(0)
    assert start['camera']=='matrix(1, 0, 0, 1, 0, 0)'
    page.screenshot(path=str(ART/'landing-overview-1440.png'))
    focused=seek(1260)
    assert focused['camera']=='matrix(1, 0, 0, 1, -340, 90)'
    assert focused['height']==80 and focused['body']==0
    opened=seek(2340)
    assert opened['height']==218 and opened['body']==1 and opened['children']==1
    page.screenshot(path=str(ART/'landing-expanded-1440.png'))
    second_focused=seek(3240)
    assert second_focused['camera']=='matrix(1, 0, 0, 1, -710, 60)'
    assert second_focused['secondHeight']==80 and second_focused['secondBody']==0
    second_opened=seek(4500)
    assert second_opened['secondHeight']==218 and second_opened['secondBody']==1 and second_opened['finalChildren']==1
    page.screenshot(path=str(ART/'landing-second-question-1440.png'))
    returned=seek(8550)
    assert returned['camera']==start['camera'] and returned['height']==80
    # The quicker sequence repeats without a playback control.
    assert page.locator('.demo-camera').evaluate('(n)=>getComputedStyle(n).animationIterationCount')=='infinite'
    assert page.locator('.demo-camera').evaluate('(n)=>getComputedStyle(n).animationDuration')=='9s'
    page.emulate_media(reduced_motion='reduce')
    expect(page.get_by_role('button',name='Pause tree preview')).to_have_count(0)
    assert page.locator('.demo-camera').evaluate('(n)=>getComputedStyle(n).animationName')=='none'
    assert page.locator('.demo-markdown').evaluate('(n)=>getComputedStyle(n).opacity')=='0'
    for width,height in [(1920,1080),(768,900),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(BASE)
        page.wait_for_load_state('networkidle')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if width == 390:
            page.locator('.landing-tree').scroll_into_view_if_needed()
        page.screenshot(path=str(ART/f'landing-aligned-{width}.png'),full_page=True)
    assert not errors,errors
    print(json.dumps({'result':'passed','flows':['two-column alignment','focus before expansion','preview and children','second question and deeper branches','return to overview','faster infinite loop','no playback button','reduced motion'],'browser_errors':errors}))
    browser.close()
