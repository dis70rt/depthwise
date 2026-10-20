"""Real-browser acceptance tests. Run against npm run dev (or DEPTHWISE_URL).
Requires Python Playwright and a Chrome installation; see README.md.
"""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('DEPTHWISE_URL', 'http://127.0.0.1:5173')
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)

def settle(page):
    page.wait_for_timeout(650)

def node(page, path):
    return page.locator('.file-node').filter(has=page.locator(f'.node-meta')).filter(has_text=path)

def file_node(page, path):
    return page.locator(f'.file-node[data-path="{path}"]').first

def upload(page, directory):
    page.locator('input[type=file]').set_input_files(str(directory))
    expect(page.locator('.import-progress')).to_have_count(0, timeout=20000)
    settle(page)

def pack_at(parent, name, files):
    root = parent / name
    root.mkdir()
    for path, text in files.items():
        dest = root / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    return root

def toggle(page, path):
    file_node(page, path).locator('.node-toggle').click(force=True)
    settle(page)

with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='depthwise-tests-') as temp:
    browser = p.chromium.launch(executable_path=os.getenv('CHROME_PATH', '/usr/bin/google-chrome'), headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440, 'height':900})
    page = context.new_page()
    errors=[]
    requests=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='Follow the question.')).to_be_visible()
    page.screenshot(path=str(ART/'empty-desktop.png'))
    # Actual directory selection, worker parsing, canonical root, authored order.
    upload(page, ROOT/'examples/database-preparation')
    expect(page.locator('.file-node')).to_have_count(4)
    assert page.locator('.file-node').evaluate_all('(nodes) => nodes.map(n => n.dataset.path)') == ['index.md','indexes/index.md','transactions/index.md','query-planning.md']
    expect(file_node(page,'index.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    page.screenshot(path=str(ART/'tree-desktop.png'))
    # Expanding a child, inline preview, focused outline, and further children.
    toggle(page, 'indexes/index.md')
    expect(page.locator('.file-node')).to_have_count(7)
    expect(file_node(page,'indexes/index.md').locator('.preview')).to_be_visible()
    expect(page.locator('.outline-rail .file-path')).to_have_text('indexes/index.md')
    assert file_node(page, 'indexes/index.md').bounding_box()['x'] < 1100
    # Siblings and variable-height cards never overlap at the same depth.
    boxes = page.locator('.file-node').evaluate_all('(nodes) => nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))')
    for a in boxes:
        for b in boxes:
            if a is not b and abs(a['x']-b['x'])<1:
                assert a['y']+a['h'] <= b['y']+1 or b['y']+b['h'] <= a['y']+1
    # Follow-ups appear only as upcoming branches, not duplicate preview links.
    expect(file_node(page,'indexes/index.md').locator('.preview')).not_to_contain_text('Follow-up questions')
    expect(page.locator('.outline-rail')).not_to_contain_text('Follow-up questions')
    expect(file_node(page,'indexes/index.md').locator('.preview a')).to_have_count(0)
    file_node(page,'indexes/index.md').locator('.node-toggle').focus()
    page.keyboard.press('ArrowRight')
    page.keyboard.press('ArrowDown')
    page.keyboard.press('Enter')
    settle(page)
    expect(file_node(page,'indexes/write-cost.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    expect(page.locator('.outline-rail .file-path')).to_have_text('indexes/write-cost.md')
    page.locator('.outline-rail').get_by_role('link', name='Compare choices').click()
    settle(page)
    expect(page.locator('.outline-rail').get_by_role('link', name='Compare choices')).to_have_attribute('aria-current','location')
    # Collapse/reopen remembers descendants. Text click only focuses.
    page.get_by_role('button', name='Return to root', exact=True).click()
    settle(page)
    file_node(page,'index.md').locator('.preview').click(position={'x':40,'y':25})
    expect(file_node(page,'index.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    toggle(page,'index.md')
    expect(page.locator('.file-node')).to_have_count(1)
    toggle(page,'index.md')
    expect(file_node(page,'indexes/write-cost.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    # Keyboard movement follows hierarchy without toggling text selection.
    root_button = file_node(page,'index.md').locator('.node-toggle')
    root_button.focus()
    root_button.press('ArrowRight')
    expect(file_node(page,'indexes/index.md').locator('.node-toggle')).to_be_focused()
    page.keyboard.press('ArrowDown')
    expect(file_node(page,'transactions/index.md').locator('.node-toggle')).to_be_focused()
    page.keyboard.press('ArrowLeft')
    expect(root_button).to_be_focused()
    # Zoom is explicit and reset/fit remain available.
    page.get_by_role('button', name='Zoom out', exact=True).click()
    settle(page)
    assert page.locator('.zoom-value').inner_text() != '100%'
    page.get_by_role('button', name='Fit visible branches', exact=True).click()
    settle(page)
    page.screenshot(path=str(ART/'tree-expanded-desktop.png'))
    # Help dialog returns focus to its trigger.
    help_button = page.get_by_role('button',name='Help and keyboard shortcuts')
    help_button.click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.keyboard.press('Escape')
    expect(help_button).to_be_focused()
    # Failed replacement is atomic.
    bad = pack_at(Path(temp),'no-markdown',{'readme.txt':'not Markdown'})
    upload(page,bad)
    expect(page.get_by_role('alert')).to_contain_text('No Markdown')
    expect(file_node(page,'index.md')).to_be_visible()
    page.get_by_role('button',name='Dismiss error').click()
    # Replacing with a second, non-computing learning pack resets the session.
    upload(page, ROOT/'examples/ecology-preparation')
    expect(page.locator('.file-node')).to_have_count(3)
    expect(page.locator('.node-toggle').first).to_contain_text('ecosystems')
    # Generic Markdown fallback retains hierarchy and exposes heading-less files.
    generic = pack_at(Path(temp),'generic-notes',{'nested/note.md':'A note without headings.','other.md':'# Other question?\n\n## A heading\n- What should we ask?'})
    upload(page,generic)
    expect(page.get_by_role('dialog')).to_contain_text('Choose your starting point')
    page.get_by_role('button',name='Browse folder-derived tree').click()
    settle(page)
    expect(page.locator('.workspace-caption')).to_contain_text('Folder-derived tree')
    page.get_by_role('button', name='Expand nested',exact=True).click(force=True)
    settle(page)
    toggle(page,'nested/note.md')
    expect(page.locator('.outline-rail')).to_contain_text('No headings')
    # Broken targets, cycles, disconnected files, fragments, long questions, and inert embeds.
    long_question='How would you evaluate a very long question that keeps asking about assumptions, constraints, failure modes, and trade-offs across several systems without losing its meaning when its preview is collapsed?'
    robust = pack_at(Path(temp),'robust',{
      'index.md': '# Root question?\n\n## Follow-up questions\n- [Child question?](nested/child.md)\n- [Missing?](missing.md)\n- [Long?](long.md)\n\n## References\n[Missing reference](missing.md)\n[Unlinked](other.md#repeat-1)\n![remote](https://example.invalid/image.png)\n<script>window.BAD=true</script>',
      'nested/child.md': '# Child question?\n\n## Explore\n[Back](../index.md#references)\n\n## Follow-up questions\n- [Root question?](../index.md)',
      'long.md':'# '+long_question+'\n\n## Think\n- Why?',
      'other.md':'# Unlinked question?\n\n## Repeat\n- Why?\n\n## Repeat\n- How?'
    })
    upload(page,robust)
    expect(page.locator('.warning-button')).to_be_visible()
    expect(page.locator('.image-placeholder')).to_be_visible()
    assert page.evaluate('window.BAD') is None
    assert not any('example.invalid' in request for request in requests)
    question = file_node(page,'long.md').locator('.node-question')
    assert question.evaluate('(n)=>n.scrollHeight>n.clientHeight')
    assert question.evaluate('(n)=>n.clientHeight <= parseFloat(getComputedStyle(n).lineHeight)*2+1')
    toggle(page,'nested/child.md')
    expect(page.locator('.reference-label').filter(has_text='Ancestor reference')).to_be_visible()
    assert page.locator('.file-node').count() == 5
    # A regular reference opens a detached root with a working return action.
    page.get_by_role('button', name='Return to root', exact=True).click()
    settle(page)
    file_node(page,'index.md').get_by_role('link',name='Unlinked',exact=True).click()
    settle(page)
    expect(page.locator('.outline-rail .file-path')).to_have_text('other.md')
    expect(page.locator('.outline-rail').get_by_role('link',name='Repeat',exact=True)).to_have_count(2)
    expect(page.locator('.outline-rail a[href="#repeat-1"]')).to_have_attribute('aria-current','location')
    page.get_by_role('button',name='← Return to main tree').click()
    settle(page)
    expect(page.locator('.outline-rail .file-path')).to_have_text('index.md')
    # Missing link gives a local message, not navigation away.
    file_node(page,'index.md').get_by_role('link',name='Missing reference',exact=True).click()
    expect(page.get_by_role('status').filter(has_text='Missing Markdown')).to_be_visible()
    # Size failure preserves the active pack.
    huge = pack_at(Path(temp),'too-big',{'index.md':'# Big?\n'+'x'*(1024*1024)})
    upload(page,huge)
    expect(page.get_by_role('alert')).to_contain_text('1 MiB')
    expect(page.locator('.folder-caption')).to_contain_text('robust')
    page.get_by_role('button',name='Dismiss error').click()
    # Two viewport widths and reduced motion preserve content, not body overflow.
    for width in (768,390):
        page.set_viewport_size({'width':width,'height':844})
        settle(page)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if width == 390:
            page.get_by_role('button',name='Outline',exact=True).click()
            expect(page.get_by_role('dialog')).to_contain_text('Document outline')
            page.keyboard.press('Escape')
        page.screenshot(path=str(ART/f'tree-{width}.png'))
    reduced = context.new_page()
    reduced.emulate_media(reduced_motion='reduce')
    reduced.goto(BASE)
    reduced.wait_for_load_state('networkidle')
    reduced.get_by_role('button',name='Or explore an example tree').click()
    settle(reduced)
    toggle(reduced,'indexes/index.md')
    assert reduced.locator('.file-node').count() == 7
    assert reduced.locator('.branch-group').first.evaluate('(n)=>getComputedStyle(n).animationName') == 'none'
    # Verify the packaged authoring skill is available from the running app.
    skill_response=context.request.get(BASE+'/depthwise-question-tree-SKILL.md')
    assert skill_response.ok
    assert 'name: depthwise-question-tree' in skill_response.text()
    # Session-only documents are cleared by reload.
    page.reload()
    expect(page.get_by_role('heading', name='Follow the question.')).to_be_visible()
    assert not errors, errors
    result={'result':'passed','browser_errors':errors,'viewports':[1440,768,390], 'flows':['directory upload','inline expansion','heading navigation','remembered descendants','keyboard navigation','zoom controls','dialog focus','atomic failed replacement','second subject','generic folders','cycles','missing links','unlinked navigation','duplicate headings','two-line truncation','inert embeds','size limit','reduced motion','session reset']}
    (ART/'browser-results.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
    browser.close()
