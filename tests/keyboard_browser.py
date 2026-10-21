"""Default keyboard navigation, repeated keys, restoration, and native input ownership."""
import json
import os
import re
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:4180')
def node(page,path):return page.locator(f'.file-node[data-path="{path}"]').first
def button(page,path):return node(page,path).locator('.node-toggle')
def focus_is(page,path):expect(button(page,path)).to_be_focused()

with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
    root=Path(temp)/'keyboard-topic';root.mkdir()
    files={
      'index.md':'# Start here?\n\n## Follow-up questions\n- [First question?](first.md)\n- [Second question?](second.md)',
      'first.md':'# First question?\n\n'+('Reading detail.\n\n'*100)+'## Follow-up questions\n- [Deeper question?](deep.md)',
      'second.md':'# Second question?\n\nAnother branch.',
      'deep.md':'# Deeper question?\n\nDepth to explore.',
      'unlinked.md':'# Separate topic?\n\n## Follow-up questions\n- [Separate child?](separate-child.md)',
      'separate-child.md':'# Separate child?\n\nA detached branch.',
    }
    for name,text in files.items():(root/name).write_text(text)
    browser=p.chromium.launch(executable_path=os.getenv('CHROME_PATH','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE);page.wait_for_load_state('networkidle')
    page.locator('input[type=file]').set_input_files(str(root))
    # No node click or manual focus setup: import lands on the active question.
    focus_is(page,'index.md')
    page.keyboard.press('ArrowRight');focus_is(page,'first.md')
    page.keyboard.press('ArrowDown');focus_is(page,'second.md')
    page.keyboard.press('ArrowUp');focus_is(page,'first.md')
    page.keyboard.press('ArrowLeft');focus_is(page,'index.md')
    # Background focus retains the active branch as the default keyboard target.
    page.locator('.tree-workspace').click(position={'x':8,'y':50})
    page.keyboard.press('ArrowRight');focus_is(page,'first.md')
    page.keyboard.press('ArrowRight')
    page.keyboard.down('ArrowRight')
    page.keyboard.down('ArrowRight')
    page.keyboard.up('ArrowRight')
    expect(button(page,'first.md')).to_have_attribute('aria-expanded','true')
    focus_is(page,'first.md')
    page.keyboard.press('Tab')
    expect(node(page,'first.md').locator('.preview')).to_be_focused()
    page.wait_for_timeout(700)
    expect(node(page,'first.md').locator('.preview')).to_be_focused()
    page.keyboard.press('Shift+Tab');focus_is(page,'first.md')
    # Another direction supersedes a pending selection without a delayed focus jump.
    page.keyboard.press('ArrowRight');focus_is(page,'deep.md')
    page.keyboard.press('Home');focus_is(page,'index.md')
    page.wait_for_timeout(700)
    focus_is(page,'index.md')
    # Default Enter/Space on background must toggle once, without page scrolling.
    page.locator('.tree-workspace').click(position={'x':8,'y':50})
    page.keyboard.press('Enter')
    expect(button(page,'index.md')).to_have_attribute('aria-expanded','false')
    page.keyboard.press('Space')
    expect(button(page,'index.md')).to_have_attribute('aria-expanded','true')
    focus_is(page,'index.md')
    page.keyboard.press('ArrowRight');focus_is(page,'first.md')
    page.keyboard.press('ArrowRight');focus_is(page,'deep.md')
    page.keyboard.press('Enter')
    expect(button(page,'deep.md')).to_have_attribute('aria-expanded','true')
    page.wait_for_timeout(550)
    page.reload();focus_is(page,'deep.md')
    page.keyboard.press('ArrowLeft');focus_is(page,'first.md')
    # Preview arrows/Home scroll reading content rather than changing branches.
    preview=node(page,'first.md').locator('.preview')
    preview.click(position={'x':30,'y':35})
    page.keyboard.press('Home')
    expect(preview).to_be_focused()
    expect(node(page,'first.md')).to_have_class(re.compile(r'\bnode-focused\b'))
    node(page,'first.md').get_by_role('button',name='Edit',exact=True).click()
    text=page.get_by_label('Markdown',exact=True)
    text.fill('# First question?\n\nTyping stays here.')
    text.press('Home');text.press('ArrowDown')
    expect(text).to_be_focused()
    expect(node(page,'first.md')).to_have_class(re.compile(r'\bnode-focused\b'))
    page.get_by_role('button',name='Discard draft',exact=True).click()
    expect(node(page,'first.md').get_by_role('button',name='Edit',exact=True)).to_be_focused()
    page.keyboard.press('ArrowLeft');focus_is(page,'index.md')
    # Native button activation remains usable, then arrows resume navigation.
    zoom=page.get_by_role('button',name='Zoom in',exact=True)
    zoom.click();before=page.locator('.zoom-value').inner_text()
    page.keyboard.press('Enter')
    expect(page.locator('.zoom-value')).not_to_have_text(before)
    expect(button(page,'index.md')).to_have_attribute('aria-expanded','true')
    page.keyboard.press('ArrowRight');focus_is(page,'first.md')
    page.keyboard.press('Home');focus_is(page,'index.md')
    page.get_by_role('button',name='Help and keyboard shortcuts').click()
    page.keyboard.press('ArrowRight');page.keyboard.press('Home')
    expect(page.get_by_role('dialog',name='A little orientation')).to_be_visible()
    expect(node(page,'index.md')).to_have_class(re.compile(r'\bnode-focused\b'))
    page.keyboard.press('Escape')
    # An add dialog owns its input/navigation keys.
    page.locator('.branch-add[data-parent-path="index.md"]').first.evaluate('(button)=>button.click()')
    path=page.get_by_label('New file path')
    path.press('Home');path.press('ArrowDown')
    expect(path).to_be_focused()
    expect(page.get_by_role('dialog',name='Add a follow-up')).to_be_visible()
    page.get_by_role('button',name='Discard draft',exact=True).click()
    # Only the detached workspace handles a key; the hidden main tree stays unchanged.
    page.get_by_role('button',name='Unlinked files',exact=False).click()
    page.get_by_role('button',name='Separate topic?',exact=False).click()
    focus_is(page,'unlinked.md')
    page.keyboard.press('ArrowRight');focus_is(page,'separate-child.md')
    page.keyboard.press('Enter')
    expect(button(page,'separate-child.md')).to_have_attribute('aria-expanded','true')
    page.get_by_role('button',name='Return to main tree',exact=False).click()
    page.keyboard.press('ArrowRight');focus_is(page,'first.md')
    # Reduced-motion/mobile entry has the same no-click defaults.
    phone=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    phone.on('pageerror',lambda error:errors.append(str(error)))
    phone.goto(BASE);phone.wait_for_load_state('networkidle')
    phone.locator('input[type=file]').set_input_files(str(root))
    focus_is(phone,'index.md')
    phone.keyboard.press('ArrowRight');focus_is(phone,'first.md')
    phone.keyboard.press('ArrowRight')
    expect(button(phone,'first.md')).to_have_attribute('aria-expanded','true')
    phone.keyboard.press('ArrowDown');focus_is(phone,'second.md')
    assert not errors,errors
    browser.close()
    print(json.dumps({'result':'passed','checks':['no-click initial focus','arrows and sibling navigation','background activation','held Right expansion','Tab is not interrupted by delayed focus','latest navigation wins','Enter/Space once','restored focus','preview and editor keys','native toolbar activation','dialog and input ownership','detached tree ownership','mobile reduced motion'],'browser_errors':errors}))
