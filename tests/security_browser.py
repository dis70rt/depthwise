"""Bounded, synthetic regression checks for single-tab pre-launch findings.
No production endpoints, private fixtures, or cross-tab conflict remediation.
"""
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('DEPTHWISE_URL','http://127.0.0.1:4173')

def node(page,path): return page.locator(f'.file-node[data-path="{path}"]').first

def rows(page):
    return page.evaluate('''() => new Promise((resolve,reject)=>{
      const request=indexedDB.open('depthwise',1);
      request.onsuccess=()=>{
        const db=request.result, tx=db.transaction('session'), store=tx.objectStore('session');
        const active=store.get('active'), draft=store.get('draft');
        tx.oncomplete=()=>{db.close();resolve({active:active.result,draft:draft.result});};
        tx.onerror=()=>reject(tx.error);
      }; request.onerror=()=>reject(request.error);
    })''')

def edit(page,path,text):
    node(page,path).get_by_role('button',name='Edit',exact=True).click()
    page.get_by_label('Markdown',exact=True).fill(text)

def apply(page):
    page.get_by_role('button',name='Update tree',exact=True).click()
    expect(page.get_by_label('Markdown',exact=True)).to_have_count(0,timeout=20000)

with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
    root=Path(temp)/'synthetic-private-pack';root.mkdir()
    (root/'index.md').write_text('# Root?\n\nOriginal.\n\n## Follow-up questions\n- [Child?](child.md)')
    (root/'child.md').write_text('# Child?\n\nOriginal child.')
    browser=p.chromium.launch(executable_path=os.getenv('CHROME_PATH','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
    blocked=[]
    def route(request):
        if urlparse(request.request.url).netloc==urlparse(BASE).netloc: request.continue_()
        else: blocked.append(request.request.url);request.abort()
    context.route('http**/*',route)
    page=context.new_page(); errors=[];csp=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda msg:csp.append(msg.text[:120]+'...'+msg.text[-200:]) if 'Content Security Policy' in msg.text else None)
    page.goto(BASE);page.wait_for_load_state('networkidle')
    expect(page.get_by_label('Remember my folder and drafts in this browser')).to_be_checked()
    page.locator('input[type=file]').set_input_files(str(root))
    expect(node(page,'index.md')).to_be_visible()
    text='# Root?\n\nApplied synthetic private marker.\n\n## Follow-up questions\n- [Child?](child.md)'
    edit(page,'index.md',text)
    expect(page.get_by_role('status').filter(has_text='Draft saved in browser')).to_be_visible()
    # Hold the older draft transaction, then a queued blocker, so the old
    # acknowledgement arrives while the latest draft is still uncommitted.
    page.evaluate('''()=>{
      const put=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(value,key){
        const request=put.call(this,value,key);
        if(key==='draft' && value?.draft?.text.includes('OLD_ACK_PROBE') && !window.oldDraftQueued){
          window.oldDraftQueued=true;
          const until=performance.now()+400, store=this;
          const spin=()=>{const r=store.get('active');r.onsuccess=()=>{if(performance.now()<until)spin();};};spin();
          const blocker=this.transaction.db.transaction('session','readwrite'), next=blocker.objectStore('session');
          let end;
          const wait=()=>{const r=next.get('active');r.onsuccess=()=>{end??=performance.now()+800;if(performance.now()<end)wait();};};wait();
        }
        return request;
      };
    }''')
    page.get_by_label('Markdown',exact=True).fill(text+'\nOLD_ACK_PROBE')
    page.wait_for_function('() => window.oldDraftQueued === true')
    page.get_by_label('Markdown',exact=True).fill(text+'\nNEW_ACK_PROBE')
    page.wait_for_timeout(550)
    expect(page.get_by_role('status').filter(has_text='Saving draft…')).to_be_visible()
    expect(page.get_by_role('status').filter(has_text='Draft saved in browser')).to_be_visible()
    assert 'NEW_ACK_PROBE' in rows(page)['draft']['draft']['text']
    page.get_by_label('Markdown',exact=True).fill(text)
    expect(page.get_by_role('status').filter(has_text='Draft saved in browser')).to_be_visible()
    # Keep an actual IDB write transaction busy for 900 ms, bounded to synthetic storage.
    page.evaluate('''()=>{
      const request=indexedDB.open('depthwise',1);
      request.onsuccess=()=>{
        const db=request.result, tx=db.transaction('session','readwrite'), store=tx.objectStore('session'), until=performance.now()+900;
        const spin=()=>{const r=store.get('active');r.onsuccess=()=>{if(performance.now()<until)spin();};};spin();
        tx.oncomplete=()=>db.close();
      };
    }''')
    page.get_by_role('button',name='Update tree',exact=True).click()
    expect(page.get_by_label('Markdown',exact=True)).to_be_disabled()
    page.keyboard.type('THIS MUST NOT REPLACE THE PENDING REVISION')
    expect(page.get_by_label('Markdown',exact=True)).to_have_count(0,timeout=20000)
    assert next(source['text'] for source in rows(page)['active']['sources'] if source['path']=='index.md')==text
    # An example query offers replacement and retains both applied data and the draft.
    edit(page,'index.md',text+'\n\nUnfinished private draft marker.')
    expect(page.get_by_role('status').filter(has_text='Draft saved in browser')).to_be_visible()
    page.goto(BASE+'/?example=database')
    expect(page.get_by_role('dialog',name='Replace this workspace?')).to_be_visible()
    assert rows(page)['active']['name']=='synthetic-private-pack'
    assert 'Unfinished private draft marker' in rows(page)['draft']['draft']['text']
    page.get_by_role('button',name='Keep current workspace',exact=True).click()
    expect(page.get_by_label('Markdown',exact=True)).to_have_value(text+'\n\nUnfinished private draft marker.')
    page.get_by_role('button',name='Discard draft',exact=True).click()
    node(page,'child.md').locator('.node-toggle').click()
    edit(page,'child.md','# Child?\n\nA later change.')
    apply(page)
    snapshot=rows(page)
    assert 'Unfinished private draft marker' not in json.dumps(snapshot)
    assert snapshot['active']['schemaVersion']==2 and 'pack' not in snapshot['active'] and 'draft' not in snapshot['active']
    # Oversized multibyte input is rejected before preview/store; valid previous text survives.
    edit(page,'child.md','# Child?\n\nKeep this bounded draft.')
    page.get_by_label('Markdown',exact=True).fill('é'*(1024*1024//2+1))
    expect(page.locator('.editor-error')).to_contain_text('1 MiB')
    expect(page.get_by_label('Markdown',exact=True)).to_have_value('# Child?\n\nKeep this bounded draft.')
    page.get_by_role('button',name='Discard draft',exact=True).click()
    # Unknown stored schema never leaves a blank page and preserves rescue/reset choices.
    page.evaluate('''()=>new Promise(resolve=>{const r=indexedDB.open('depthwise',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('session','readwrite'),s=tx.objectStore('session'),a=s.get('active');a.onsuccess=()=>s.put({...a.result,schemaVersion:999},'active');tx.oncomplete=()=>{db.close();resolve();};};})''')
    page.reload()
    expect(page.get_by_role('heading',name='Recover your workspace')).to_be_visible()
    with page.expect_download() as download:
        page.get_by_role('button',name='Download recovery copy').click()
    destination=Path(temp)/'recovery.json';download.value.save_as(str(destination))
    assert 'Applied synthetic private marker' in destination.read_text()
    page.once('dialog',lambda dialog:dialog.accept())
    page.get_by_role('button',name='Forget saved session and reload').click()
    expect(page.locator('.landing-page')).to_be_visible()
    # Session-only mode neither writes documents nor claims browser durability.
    page.get_by_label('Remember my folder and drafts in this browser').uncheck()
    expect(page.get_by_label('Remember my folder and drafts in this browser')).not_to_be_checked()
    page.locator('input[type=file]').set_input_files(str(root))
    expect(node(page,'index.md')).to_be_visible()
    edit(page,'index.md','# Root?\n\nOnly in memory.')
    apply(page)
    expect(page.locator('.workspace-savebar')).to_contain_text('This tab only')
    assert not rows(page).get('active') and not rows(page).get('draft')
    page.reload();expect(page.locator('.landing-page')).to_be_visible()
    # The shipped privacy notice and reporting identity are accessible without importing.
    page.get_by_role('button',name='Privacy and local data',exact=True).click()
    expect(page.get_by_role('dialog')).to_contain_text('Ethernode')
    expect(page.get_by_role('dialog')).to_contain_text('das.saikat.in@gmail.com')
    page.get_by_role('button',name='Close dialog',exact=True).click()
    large=Path(temp)/'large-worker-pack';large.mkdir()
    (large/'index.md').write_text('# Compression worker?\n\n'+'Bounded synthetic text. '*16000)
    page.locator('input[type=file]').set_input_files(str(large))
    expect(node(page,'index.md')).to_be_visible()
    page.get_by_role('button',name='Save & export',exact=True).click()
    with page.expect_download(timeout=20000) as zipped:
        page.get_by_role('button',name='Download ZIP',exact=True).click()
    assert zipped.value.suggested_filename.endswith('.zip')
    assert not blocked,blocked
    assert not errors,errors
    assert not csp,csp
    browser.close()
    print(json.dumps({'result':'passed','checks':['older acknowledgements cannot mark newer drafts saved','pending Apply cannot lose typing','example URL replacement protection','no duplicate discarded drafts','multibyte authoring limit','unknown-schema recovery download and reset','session-only mode','privacy notice','no external requests or CSP errors'],'cross_tab_remediation':'excluded by user'}))
