"""Wide/deep folder, cancellation, malformed input, and long-preview checks."""
import json
import os
import tempfile
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'
ART.mkdir(exist_ok=True)
BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:5173')

def create(root, path, text):
    file=root/path
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_text(text)
    return file

with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='depthwise-stress-') as temp:
    browser=p.chromium.launch(executable_path=os.getenv('CHROME_PATH','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='Or explore an example tree').click()
    expect(page.locator('.file-node')).to_have_count(4)
    # 1,000 files, 999 visible siblings; only the root preview is rendered.
    wide=Path(temp)/'wide'
    root='# How do these questions connect?\n\n## Follow-up questions\n'
    for i in range(1,1000):
        create(wide,f'q-{i}.md',f'# Question {i}?\n\n## Explore\n- What would you compare?\n')
        root+=f'- [Question {i}?](q-{i}.md)\n'
    create(wide,'index.md',root)
    start=time.perf_counter()
    page.locator('input[type=file]').set_input_files(str(wide))
    expect(page.locator('.file-node')).to_have_count(1000,timeout=30000)
    expect(page.locator('.import-progress')).to_have_count(0)
    wide_seconds=time.perf_counter()-start
    print(f"Wide import: {wide_seconds:.2f}s",flush=True)
    assert page.locator('.markdown').count()==1, 'Collapsed documents should not all render their Markdown.'
    page.get_by_role('button',name='Zoom out',exact=True).click()
    expect(page.locator('.zoom-value')).not_to_have_text('100%')
    # A deep 1,000-file import only materializes visible generations.
    deep=Path(temp)/'deep'
    for i in range(1000):
        name='index.md' if i==0 else f'{i}.md'
        tail=f'\n\n## Follow-up questions\n- [Question {i+1}?]({i+1}.md)' if i<999 else ''
        create(deep,name,f'# Question {i}?'+tail)
    start=time.perf_counter()
    page.locator('input[type=file]').set_input_files(str(deep))
    try:
        expect(page.locator('.folder-caption')).to_have_text('deep',timeout=30000)
    except Exception:
        print('DIAGNOSTIC',json.dumps({'errors':errors,'alerts':page.get_by_role('alert').all_text_contents(),'progress':page.locator('.import-progress').all_text_contents(),'dialogs':page.get_by_role('dialog').all_text_contents(),'folder':page.locator('.folder-caption').all_text_contents()}))
        raise
    expect(page.locator('.file-node')).to_have_count(2)
    deep_seconds=time.perf_counter()-start
    print(f"Deep import: {deep_seconds:.2f}s",flush=True)
    # Near the total supported limit: 20 files below 1 MiB each, ~19 MiB combined.
    large=Path(temp)/'large'
    links=[]
    for i in range(20):
        links.append(f'- [Large question {i}?]({i}.md)')
        body=f'# Large question {i}?\n\n## Evidence\n\n'+('What evidence would change your mind? '*1000+'\n\n')*26
        create(large,f'{i}.md',body)
    create(large,'index.md','# Large pack?\n\n## Follow-up questions\n'+'\n'.join(links))
    total_bytes=sum(f.stat().st_size for f in large.rglob('*.md'))
    assert total_bytes < 20*1024*1024
    # Cancel while reading/parsing, retaining the current pack.
    page.locator('input[type=file]').set_input_files(str(large))
    page.get_by_role('button',name='Cancel import').click(timeout=15000)
    expect(page.locator('.import-progress')).to_have_count(0)
    expect(page.locator('.folder-caption')).to_have_text('deep')
    page.evaluate('window.heartbeats=0;window.heartbeatTimer=setInterval(()=>window.heartbeats++,50)')
    start=time.perf_counter()
    page.locator('input[type=file]').set_input_files(str(large))
    expect(page.locator('.folder-caption')).to_have_text('large',timeout=120000)
    expect(page.locator('.file-node')).to_have_count(21)
    large_seconds=time.perf_counter()-start
    print(f"Large import: {large_seconds:.2f}s",flush=True)
    beats=page.evaluate('window.heartbeats')
    page.evaluate('clearInterval(window.heartbeatTimer)')
    assert beats>3, 'Import must leave the main thread responsive.'
    assert page.locator('.markdown').count()==1
    # Long content stays internally scrollable and does not stretch the tree width.
    page.get_by_role('button',name='All files',exact=True).click()
    page.locator('.file-picker-list button').filter(has_text='Large question 0?').click()
    page.wait_for_timeout(500)
    preview=page.locator('.file-node[data-path="0.md"] .preview')
    assert preview.evaluate('(n)=>n.scrollHeight>n.clientHeight')
    assert preview.bounding_box()['height'] < 600
    # Invalid UTF-8 and file-count failures preserve the current imported documents.
    invalid=Path(temp)/'invalid'
    file=create(invalid,'index.md','# Broken?')
    file.write_bytes(b'\xff\xfe\x00')
    page.locator('input[type=file]').set_input_files(str(invalid))
    expect(page.get_by_role('alert')).to_contain_text('UTF-8')
    expect(page.locator('.folder-caption')).to_have_text('large')
    page.get_by_role('button',name='Dismiss error').click()
    create(wide,'one-too-many.md','# Extra?')
    page.locator('input[type=file]').set_input_files(str(wide))
    expect(page.get_by_role('alert')).to_contain_text('1,000')
    expect(page.locator('.folder-caption')).to_have_text('large')
    # Rapid interruption should end in a coherent view, including focus after collapse.
    page.goto(BASE+'/?example=database')
    page.wait_for_load_state('networkidle')
    button=page.locator('.file-node[data-path="indexes/index.md"] .node-toggle')
    for _ in range(7):button.click(force=True)
    page.wait_for_timeout(1000)
    expect(button).to_have_attribute('aria-expanded','true')
    expect(page.locator('.file-node')).to_have_count(7)
    assert not errors,errors
    result={'result':'passed','wide_files':1000,'wide_import_seconds':round(wide_seconds,2),'deep_files':1000,'deep_import_seconds':round(deep_seconds,2),'large_bytes':total_bytes,'large_import_seconds':round(large_seconds,2),'import_heartbeats':beats,'browser_errors':errors}
    (ART/'stress-results.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
    browser.close()
