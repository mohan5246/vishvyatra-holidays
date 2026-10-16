"""
Build a static TEST COPY of vishvyatraholidays.com with the plugin's features
applied, for review on GitHub Pages (or any static host).

Inputs:
  live_dir     pages saved by tools/crawl_live_site.py
  plugin_json  output of `wp eval-file tools/export_plugin_output.php`
  out_dir      folder to publish
  base         URL path the copy is served from, e.g. /vishvyatra-holidays/

What it does to each page (mirrors what the plugin does on WordPress):
  - removes Pay Now / payment links and redirects /qr-code/ to the homepage
  - adds the service sections + enquiry forms to service pages, creates the
    hotel / passport / other pages, adds the homepage service grid, popup,
    "Get a Quote" tab and chatbot
  - hides the old general enquiry slider/popup on the homepage
Test-copy safety:
  - forms run in demo mode (validated in the browser, nothing is sent)
  - the site's existing Contact Form 7 forms are disabled so no test message
    reaches the business; their scripts are removed
  - pages are marked noindex/nofollow and carry a small "TEST COPY" label
Images, styles and theme scripts are still loaded from the live website, so
the design is identical.
"""
import html as htmllib
import json
import os
import re
import shutil
import sys

LIVE, PLUGIN_JSON, OUT, BASE = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE_HOST = 'https://vishvyatraholidays.com'

data = json.load(open(PLUGIN_JSON, encoding='utf-8'))
LOCAL_HOME = data['home_url']  # e.g. http://localhost:8080/
SERVICES = data['services']
SLUG_TO_KEY = {s['slug']: k for k, s in SERVICES.items()}

PAY_PATTERNS = ['/qr-code', 'payumoney.com', 'razorpay', 'paytm.me', 'instamojo']
PAY_TEXTS = ['pay now', 'gift card']

pages = set()
for root, _, files in os.walk(LIVE):
    if 'index.html' in files:
        rel = os.path.relpath(root, LIVE)
        pages.add('' if rel == '.' else rel.replace(os.sep, '/'))
NEW_SLUGS = [s['slug'] for s in SERVICES.values() if s['slug'] not in pages]
ALL_SLUGS = pages | set(NEW_SLUGS)


def localize(s):
    """Plugin markup was rendered on a local WordPress: point it at the copy."""
    return s.replace(LOCAL_HOME, BASE).replace(LOCAL_HOME.replace('/', '\\/'), BASE.replace('/', '\\/'))


def is_payment(attrs, inner):
    m = re.search(r'\bhref\s*=\s*(["\'])(.*?)\1', attrs, re.S | re.I)
    href = htmllib.unescape(m.group(2)).lower() if m else ''
    if href and any(p in href for p in PAY_PATTERNS):
        return True
    text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', inner)).strip().lower()
    return text in PAY_TEXTS


def strip_payments(page):
    def repl(m):
        if not is_payment(m.group(3), m.group(4)):
            return m.group(0)
        opened, closed = bool(m.group(1)), bool(m.group(5))
        if opened and closed:
            return ''
        return (m.group(1) or '') + (m.group(5) or '')
    return re.sub(r'(<(div|p|li|span)\b[^>]*>\s*)?<a\b([^>]*)>(.*?)</a>(\s*</\2>)?', repl, page, flags=re.S | re.I)


def rewrite_links(page):
    def repl(m):
        quote, path = m.group(1), m.group(2) or '/'
        if re.match(r'/(wp-content|wp-includes|wp-json|wp-admin|xmlrpc|feed|comments)', path):
            return m.group(0)
        clean = path.split('#')[0].split('?')[0].strip('/')
        if clean not in ALL_SLUGS:
            return m.group(0)  # not in the copy: keep the live link
        frag = '#' + path.split('#', 1)[1] if '#' in path else ''
        return 'href=' + quote + BASE + (clean + '/' if clean else '') + frag + quote
    return re.sub(r'href=(["\'])https?://(?:www\.)?vishvyatraholidays\.com(/[^"\']*)?\1', repl, page)


def drop_css_fallback(page):
    # Divi re-checks its cached CSS by reading cssRules, which browsers block
    # for stylesheets on another domain (the copy loads them from the live site).
    return re.sub(r'\s+on(error|load)="et_core_page_resource_fallback\([^"]*\)"', '', page)


def disable_cf7(page):
    page = re.sub(r"<script[^>]*(contact-form-7|connect-contact-form-7|wpcf7|recaptcha)[^>]*>.*?</script>", '', page, flags=re.S | re.I)
    page = re.sub(r"<script[^>]*google\.com/recaptcha[^>]*>\s*</script>", '', page, flags=re.I)
    return page


def page_config(slug):
    cfg = json.loads(localize(json.dumps(data['config'])))
    cfg['restUrl'] = None  # demo mode: nothing is sent anywhere
    cfg['homeUrl'] = BASE
    cfg['isFrontPage'] = slug == ''
    cfg['currentService'] = SLUG_TO_KEY.get(slug)
    for key, svc in cfg['services'].items():
        svc['url'] = BASE + SERVICES[key]['slug'] + '/'
    cfg['contact']['contact_page'] = BASE + 'contact-us/'
    return cfg


TEST_CSS = """<style id="vy-test-copy">
@font-face{font-family:ETmodules;font-display:swap;src:url(BASEPLACEHOLDERplugin/static-assets/fonts/modules.woff) format("woff");font-weight:400;font-style:normal}
.vy-test-badge{position:fixed;left:8px;bottom:64px;z-index:99999;background:#fff3cd;color:#664d03;border:1px solid #e0c36b;border-radius:6px;padding:4px 8px;font:700 11px/1.3 Lato,Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.15);max-width:60vw}
</style>"""

CF7_BLOCK = """<script>
document.addEventListener('submit', function (e) {
  if (e.target.closest && e.target.closest('.wpcf7-form')) {
    e.preventDefault(); e.stopImmediatePropagation();
    alert('Test copy: this existing contact form is switched off so no test messages reach VishvYatra Holidays.');
  }
}, true);
</script>"""


def inject(page, slug):
    cfg = page_config(slug)
    page = re.sub(r"<meta name=['\"]robots['\"][^>]*>", '', page, flags=re.I)
    head = ('<meta name="robots" content="noindex,nofollow">\n'
            '<link rel="stylesheet" href="' + BASE + 'plugin/assets/css/vy.css">\n' + TEST_CSS)
    page = page.replace('</head>', head.replace('BASEPLACEHOLDER', BASE) + '\n</head>', 1)

    scripts = ['<div id="vy-popup-root"></div><div id="vy-chatbot-root"></div>']
    if slug == '':
        scripts.append('<button type="button" class="vy-side-tab" data-vy-open-services>Get a Quote</button>')
    scripts.append('<div class="vy-test-badge" role="note">TEST COPY - not the official website. Forms are not sent.</div>')
    scripts.append('<script>window.VY_CONFIG = ' + json.dumps(cfg) + ';'
                   '(function(d){window.VY_CONFIG.today=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");})(new Date());</script>')
    for js in ['vy-core', 'vy-xlsx', 'vy-forms', 'vy-popup', 'vy-chatbot']:
        scripts.append('<script src="' + BASE + 'plugin/assets/js/' + js + '.js"></script>')
    scripts.append(CF7_BLOCK)
    return page.replace('</body>', '\n'.join(scripts) + '\n</body>', 1)


def add_body_class(page, cls):
    return re.sub(r'<body class="', '<body class="' + cls + ' ', page, count=1)


def write(slug, page):
    dest = os.path.join(OUT, slug, 'index.html') if slug else os.path.join(OUT, 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(page)


ENTRY_END = '</div> <!-- .entry-content -->'
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)

for slug in sorted(pages):
    src = os.path.join(LIVE, slug, 'index.html') if slug else os.path.join(LIVE, 'index.html')
    page = open(src, encoding='utf-8').read()

    if slug == 'qr-code':  # payments are disabled: same as the plugin's redirect
        write(slug, '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">'
                    '<meta http-equiv="refresh" content="0;url=' + BASE + '"><a href="' + BASE + '">Home</a>')
        continue

    page = drop_css_fallback(disable_cf7(strip_payments(page)))
    if slug == '':
        page = add_body_class(page, 'vy-hide-general-enquiry')
        page = page.replace(ENTRY_END, localize(data['grid']) + ENTRY_END, 1)
    elif slug in SLUG_TO_KEY:
        page = page.replace(ENTRY_END, localize(data['blocks'][SLUG_TO_KEY[slug]]['existing']) + ENTRY_END, 1)
    write(slug, inject(rewrite_links(page), slug))

# Pages the live site doesn't have yet: the visa page's layout (header,
# menu, footer) with the new service content in the main area.
template = open(os.path.join(LIVE, 'visa-services', 'index.html'), encoding='utf-8').read()
for slug in NEW_SLUGS:
    key = SLUG_TO_KEY[slug]
    label = SERVICES[key]['label']
    page = drop_css_fallback(disable_cf7(strip_payments(template)))
    page = re.sub(r'<div id="main-content">.*</div> <!-- #main-content -->',
                  lambda m: '<div id="main-content">' + localize(data['blocks'][key]['new']) + '</div> <!-- #main-content -->',
                  page, count=1, flags=re.S)
    page = re.sub(r'<title>.*?</title>', '<title>' + htmllib.escape(label) + ' | Vishvyatra Holidays</title>', page, count=1, flags=re.S)
    page = re.sub(r'<link rel="canonical"[^>]*>', '', page)
    write(slug, inject(rewrite_links(page), slug))

# Plugin assets.
shutil.copytree(os.path.join(REPO, 'assets'), os.path.join(OUT, 'plugin', 'assets'))
# The theme's icon font: the live server doesn't allow cross-domain font use.
shutil.copytree(os.path.join(REPO, 'tools', 'static-assets'), os.path.join(OUT, 'plugin', 'static-assets'))
open(os.path.join(OUT, '.nojekyll'), 'w').close()
open(os.path.join(OUT, '404.html'), 'w').write('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=' + BASE + '"><a href="' + BASE + '">Home</a>')
print('built', len(pages), 'live pages +', len(NEW_SLUGS), 'new pages:', NEW_SLUGS)
