"""Browser integration for landing-page folder drops (synthetic directory entries)."""
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
    expect(page.get_by_role('region',name='Markdown folder drop zone')).to_be_visible()
    page.screenshot(path=str(ART/'drop-landing-1440.png'))
    page.evaluate('''() => {
      const file = (name,body) => ({name,isFile:true,isDirectory:false,file:resolve=>resolve(new File([body],name,{type:'text/markdown'}))});
      const directory = (name,batches) => ({name,isFile:false,isDirectory:true,createReader:()=>{let i=0;return{readEntries:resolve=>resolve(batches[i++]||[])}}});
      const folder = directory('dropped-learning',[
        [file('index.md','# Dropped root?\\n\\n## Follow-up questions\\n- [Nested question?](nested/child.md)'),directory('nested',[[file('child.md','# Nested question?\\n\\n## Explore\\n- Why?')]])],
        [file('extra.md','# Another question?')]
      ]);
      const transfer = new DataTransfer();
      transfer.items.add(new File([''],'placeholder.md'));
      Object.defineProperty(transfer,'items',{value:[{kind:'file',webkitGetAsEntry:()=>folder}]});
      window.folderDrop=transfer;
      document.querySelector('main').dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    }''')
    expect(page.locator('.folder-dropzone')).to_have_class('folder-dropzone drop-active')
    expect(page.locator('.dropzone-heading')).to_contain_text('Release to open your folder')
    page.screenshot(path=str(ART/'drop-hover-1440.png'))
    # Entering/leaving children must not flicker the drag state off.
    page.evaluate('''() => {
      const button=document.querySelector('.folder-dropzone button');
      for(const type of ['dragenter','dragleave']) button.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:folderDrop}));
    }''')
    expect(page.locator('.folder-dropzone')).to_have_class('folder-dropzone drop-active')
    page.evaluate("document.querySelector('main').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:folderDrop}))")
    expect(page.locator('.folder-caption')).to_have_text('dropped-learning',timeout=15000)
    expect(page.locator('.file-node[data-path="nested/child.md"]')).to_have_count(1)
    expect(page.locator('.tree-status')).to_contain_text('3 Markdown files')
    # Failed imports stay on the landing screen with an actionable message.
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.evaluate('''() => {
      const transfer=new DataTransfer();
      transfer.items.add(new File(['hello'],'notes.txt'));
      document.querySelector('main').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    }''')
    expect(page.get_by_role('alert')).to_contain_text('No Markdown')
    expect(page.get_by_role('heading',name='Follow the question.')).to_be_visible()
    for width in [768,390]:
        page.set_viewport_size({'width':width,'height':844})
        page.goto(BASE)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('region',name='Markdown folder drop zone')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(ART/f'drop-landing-{width}.png'))
    assert not errors,errors
    print(json.dumps({'result':'passed','browser_errors':errors,'viewports':[1440,768,390]}))
    browser.close()
