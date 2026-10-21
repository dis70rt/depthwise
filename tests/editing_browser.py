"""Real-browser editing, draft recovery, ZIP contents and native writable handles.
Native directory picker UI is replaced with a real origin-private directory handle;
this exercises file writes and IndexedDB handle persistence without an OS dialog.
"""
import json
import os
import tempfile
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('DEPTHWISE_URL', 'http://127.0.0.1:4173')
ART = Path(__file__).resolve().parents[1] / 'artifacts'
ART.mkdir(exist_ok=True)

def node(page,path): return page.locator(f'.file-node[data-path="{path}"]').first

def editor(page): return page.get_by_role('dialog')

def edit(page,path):
    node(page,path).get_by_role('button',name='Edit',exact=True).click()
    expect(node(page,path).get_by_label('Markdown',exact=True)).to_be_visible()
    expect(page.get_by_role('dialog')).to_have_count(0)

with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
    root = Path(temp)/'editable-topic'
    root.mkdir()
    original = '# Main question?\n\nOriginal answer.\n\n## Follow-up questions\n- [Existing child?](child.md)\n'
    (root/'index.md').write_text(original)
    (root/'child.md').write_text('# Existing child?\n\nOriginal child answer.')
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    errors=[]
    page.on('pageerror', lambda error:errors.append(str(error)))
    page.goto(BASE)
    expect(page.locator('.folder-import-button')).to_be_enabled()
    page.locator('input[type=file]').set_input_files(str(root))
    expect(node(page,'index.md')).to_be_visible()
    edit(page,'index.md')
    updated = original.replace('Original answer.','Edited answer with **bold**, `code`, and a [link](https://example.com).\n\n## Notes\n\n> A useful note.\n\n| Key | Value |\n| --- | --- |\n| one | two |')
    page.get_by_label('Markdown',exact=True).fill(updated)
    page.get_by_role('button',name='Preview',exact=True).click()
    expect(page.locator('.editor-preview strong')).to_have_text('bold')
    expect(page.locator('.editor-preview table')).to_be_visible()
    page.get_by_role('button',name='Write',exact=True).click()
    for width in (1440,768,390):
        page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
        expect(page.get_by_label('Markdown',exact=True)).to_be_in_viewport(ratio=1)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        button=page.get_by_role('button',name='Update tree',exact=True).bounding_box()
        assert button['y']+button['height'] < page.viewport_size['height'], button
        page.screenshot(path=str(ART/f'markdown-editor-{width}.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    page.get_by_role('button',name='Update tree',exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(node(page,'index.md').locator('.preview')).to_contain_text('Edited answer')
    expect(page.locator('.workspace-savebar')).to_contain_text('1 modified file(s)')
    # Draft is separate: a refresh recovers it without changing the tree.
    node(page,'child.md').locator('.node-toggle').click()
    edit(page,'child.md')
    draft = '# Unfinished thought?\n\nKeep **all** of this draft.'
    page.get_by_label('Markdown',exact=True).fill(draft)
    expect(page.get_by_role('status').filter(has_text='Draft saved in browser')).to_be_visible()
    page.reload()
    expect(page.get_by_label('Markdown',exact=True)).to_have_value(draft)
    expect(node(page,'child.md').locator('.node-question')).to_have_text('Existing child?')
    node(page,'child.md').locator('.node-toggle').click()
    expect(page.get_by_label('Markdown',exact=True)).to_have_count(0)
    page.get_by_role('button',name='Resume draft',exact=True).click()
    expect(node(page,'child.md').get_by_label('Markdown',exact=True)).to_have_value(draft)
    page.get_by_role('button',name='Keep draft',exact=True).click()
    page.get_by_role('button',name='Resume draft',exact=True).click()
    expect(page.get_by_label('Markdown',exact=True)).to_have_value(draft)
    page.get_by_role('button',name='Discard draft',exact=True).click()
    page.get_by_role('button',name='Return to root',exact=True).click()
    page.wait_for_timeout(350)
    page.screenshot(path=str(ART/'branch-edit-controls-1440.png'))
    assert node(page,'index.md').locator('.node-footer').get_by_role('button',name='Edit',exact=True).count()==1
    assert node(page,'index.md').get_by_role('button',name='Collapse',exact=True).count()==0
    # Adding a branch creates both the file and parent link.
    page.locator('.branch-add[data-parent-path="index.md"]').first.click()
    expect(editor(page)).to_be_visible()
    page.get_by_label('New file path').fill('ideas/deeper.md')
    child = '# Why go deeper?\n\nA complete answer.\n\n- First point\n- Second point\n'
    page.get_by_label('Markdown',exact=True).fill(child)
    page.get_by_role('button',name='Add to tree',exact=True).click()
    expect(node(page,'ideas/deeper.md')).to_be_visible()
    # Invalid/colliding filenames preserve the draft and the existing file.
    page.locator('.branch-add[data-parent-path="index.md"]').first.click()
    page.get_by_label('New file path').fill('child.md')
    page.get_by_label('Markdown',exact=True).fill('# Collision?')
    page.get_by_role('button',name='Add to tree',exact=True).click()
    expect(page.locator('.editor-error')).to_contain_text('already exists')
    expect(page.get_by_label('Markdown',exact=True)).to_have_value('# Collision?')
    page.get_by_role('button',name='Discard draft',exact=True).click()
    page.reload()
    expect(node(page,'ideas/deeper.md')).to_be_visible()
    expect(page.get_by_role('dialog')).to_have_count(0)
    # The exported archive contains real, reimportable Markdown and folder structure.
    page.get_by_role('button',name='Save & export',exact=True).click()
    with page.expect_download() as download:
        page.get_by_role('button',name='Download ZIP',exact=True).click()
    zip_path=Path(temp)/'export.zip'
    download.value.save_as(str(zip_path))
    with zipfile.ZipFile(zip_path) as archive:
        assert set(archive.namelist())=={'editable-topic/index.md','editable-topic/child.md','editable-topic/ideas/deeper.md'}
        assert archive.read('editable-topic/ideas/deeper.md').decode()==child
        parent=archive.read('editable-topic/index.md').decode()
        assert 'Edited answer' in parent and '[Why go deeper?](ideas/deeper.md)' in parent
    assert (root/'index.md').read_text()==original, 'Browser edits must not silently write to disk.'
    # A real writable handle is selected via a stub; browser APIs do the actual IO.
    page.evaluate('''() => { window.showDirectoryPicker = async () => {
      const root = await navigator.storage.getDirectory();
      return root.getDirectoryHandle('output', {create:true});
    }; }''')
    page.get_by_role('button',name='Save to folder',exact=True).click()
    expect(page.locator('.save-options')).to_contain_text('Saved 3 Markdown file(s)')
    disk_parent = page.evaluate('''async () => {
      const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('output');
      return (await (await dir.getFileHandle('index.md')).getFile()).text();
    }''')
    assert disk_parent==parent
    # Remembering a handle must not break session recovery.
    page.reload()
    expect(node(page,'index.md')).to_be_visible()
    page.get_by_role('button',name='Save & export',exact=True).click()
    expect(page.locator('.save-options')).to_contain_text('Connected to output')
    page.get_by_role('button',name='Close dialog',exact=True).click()
    edit(page,'index.md')
    page.get_by_label('Markdown',exact=True).fill(parent.replace('Edited answer','New local revision'))
    page.get_by_role('button',name='Update tree',exact=True).click()
    page.evaluate('''async () => {
      const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('output');
      const stream=await (await dir.getFileHandle('index.md')).createWritable();
      await stream.write('# External edit'); await stream.close();
    }''')
    page.get_by_role('button',name='Save & export',exact=True).click()
    page.get_by_role('button',name='Save to folder',exact=True).click()
    expect(page.locator('.save-options .editor-error')).to_contain_text('changed outside Depthwise')
    assert page.evaluate('''async () => {
      const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('output');
      return (await (await dir.getFileHandle('index.md')).getFile()).text();
    }''')=='# External edit'
    expect(page.locator('.workspace-savebar')).to_contain_text('1 modified file(s)')
    assert not errors, errors
    page.get_by_role('button',name='Close dialog',exact=True).click()
    page.locator('input[type=file]').set_input_files(str(root))
    expect(page.get_by_role('dialog')).to_contain_text('Replace this workspace?')
    page.get_by_role('button',name='Keep current workspace',exact=True).click()
    expect(node(page,'index.md').locator('.preview')).to_contain_text('New local revision')
    # Unsupported browsers still edit and export.
    unsupported=browser.new_context(reduced_motion='reduce')
    unsupported.add_init_script("Object.defineProperty(window,'showDirectoryPicker',{value:undefined,configurable:true})")
    fallback=unsupported.new_page()
    fallback.goto(BASE)
    fallback.locator('input[type=file]').set_input_files(str(root))
    expect(node(fallback,'index.md')).to_be_visible()
    edit(fallback,'index.md')
    fallback.get_by_label('Markdown',exact=True).fill('# Browser-only edit?\n\nStill works.')
    fallback.get_by_role('button',name='Update tree',exact=True).click()
    fallback.get_by_role('button',name='Save & export',exact=True).click()
    expect(fallback.locator('.save-options')).to_contain_text('isn’t available in this browser')
    expect(fallback.get_by_role('button',name='Save to folder',exact=True)).to_have_count(0)
    expect(fallback.get_by_role('button',name='Download ZIP',exact=True)).to_be_enabled()
    browser.close()
    print(json.dumps({'result':'passed','flows':['edit and preview','draft recovery','keep/discard draft','add linked Markdown','duplicate protection','ZIP contents','native writable handle','persisted handle','external edit conflict','unsupported browser'],'viewports':[1440,768,390],'browser_errors':errors}))
