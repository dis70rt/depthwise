"""Browser persistence: uploaded Markdown, deep paths, reading position and viewport."""
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('DEPTHWISE_URL', 'http://127.0.0.1:4173')

def node(page, path):
    return page.locator(f'.file-node[data-path="{path}"]').first

def saved(page):
    return page.evaluate('''() => new Promise((resolve, reject) => {
      const request = indexedDB.open('depthwise', 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('session');
        const view = tx.objectStore('session').get('view');
        view.onsuccess = () => resolve(view.result?.view);
        tx.oncomplete = () => db.close();
      };
      request.onerror = () => reject(request.error);
    })''')

with tempfile.TemporaryDirectory() as folder, sync_playwright() as p:
    root = Path(folder) / 'saved-learning'
    root.mkdir()
    for depth in range(6):
        name = 'index.md' if depth == 0 else f'level-{depth}.md'
        body = f'# Question {depth}\n\n' + '\n\n'.join(f'## Detail {i}\n\nThis is a paragraph to explore at depth {depth}.' for i in range(35))
        if depth < 5:
            body += f'\n\n## Follow-up questions\n- [Question {depth+1}](level-{depth+1}.md)\n'
        (root / name).write_text(body)
    (root / 'unlinked.md').write_text('# Outside the main tree\n\n' + ('Extra reading.\n\n' * 100))
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    expect(page.locator('.folder-import-button')).to_be_enabled()
    page.locator('input[type=file]').set_input_files(str(root))
    expect(node(page, 'index.md')).to_be_visible()
    for depth in range(1,6):
        question = node(page, f'level-{depth}.md').locator('.node-toggle')
        question.click()
        expect(question).to_have_attribute('aria-expanded','true')
    preview = node(page, 'level-5.md').locator('.preview')
    page.get_by_role('button',name='Zoom out',exact=True).click()
    preview.evaluate('(el) => { el.scrollTop = 700; }')
    page.wait_for_timeout(500)
    before = saved(page)
    assert len(before['expanded']) == 6, before
    assert before['focused'].endswith('level-5.md"]'), before
    assert dict(before['scrolls'])[before['focused']] >= 690, before
    page.reload()
    expect(node(page, 'level-5.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    page.wait_for_timeout(600)
    assert node(page,'level-5.md').evaluate('(el) => el.classList.contains("node-focused")')
    after = saved(page)
    assert after['expanded'] == before['expanded'], after
    assert abs(node(page,'level-5.md').locator('.preview').evaluate('(el) => el.scrollTop') - 700) < 3
    for key in ('scale','positionX','positionY'):
        assert abs(after['viewport'][key]-before['viewport'][key]) < 3, (before,after)
    # Home is reachable without losing exploration; continue returns to the same place.
    page.get_by_role('link',name='Depthwise home',exact=True).click()
    expect(page.locator('.landing-page')).to_be_visible()
    expect(page.get_by_role('button',name='Continue exploring',exact=False)).to_contain_text('saved-learning')
    page.get_by_role('button',name='Continue exploring',exact=False).click()
    expect(node(page,'level-5.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    page.wait_for_timeout(400)
    assert abs(node(page,'level-5.md').locator('.preview').evaluate('(el) => el.scrollTop') - 700) < 3
    # A new tab needs neither the original File objects nor another upload.
    second = context.new_page()
    second.goto(BASE)
    expect(node(second,'level-5.md').locator('.node-toggle')).to_have_attribute('aria-expanded','true')
    # Different viewport: restore the path and bring the question into view.
    second.set_viewport_size({'width':390,'height':844})
    second.reload()
    expect(node(second,'level-5.md')).to_be_visible()
    second.wait_for_timeout(700)
    box = node(second,'level-5.md').bounding_box()
    assert box['x'] >= 0 and box['x'] < 390 and box['y'] >= 0 and box['y'] < 844, box
    second.close()
    # Unlinked files retain their own exploration and return path.
    page.get_by_role('button',name='Unlinked files',exact=False).click()
    page.get_by_role('button',name='Outside the main tree',exact=False).click()
    expect(node(page,'unlinked.md')).to_be_visible()
    page.wait_for_timeout(700)
    page.reload()
    expect(node(page,'unlinked.md')).to_be_visible()
    page.get_by_role('button',name='Return to main tree',exact=False).click()
    expect(node(page,'level-5.md')).to_be_visible()
    # Clearing storage is explicit and returns to the landing page.
    page.get_by_role('button',name='Help and keyboard shortcuts').click()
    page.get_by_role('button',name='Forget saved session').click()
    expect(page.locator('.landing-page')).to_be_visible()
    page.reload()
    expect(page.locator('.landing-page')).to_be_visible()
    assert not errors, errors
    # Disabled storage must not prevent importing and exploring.
    isolated = browser.new_context()
    isolated.add_init_script("Object.defineProperty(window, 'indexedDB', {get() {throw new Error('Blocked storage')}})")
    unavailable = isolated.new_page()
    unavailable.goto(BASE)
    expect(unavailable.locator('.landing-page')).to_be_visible()
    expect(unavailable.locator('.error-banner')).to_contain_text('couldn’t save')
    unavailable.locator('input[type=file]').set_input_files(str(root))
    expect(node(unavailable,'index.md')).to_be_visible()
    browser.close()
    print('Session restore passed: folder, deep path, reading position, viewport, new tab, mobile, clear and unavailable storage.')
