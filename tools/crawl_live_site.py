"""Download the public HTML of vishvyatraholidays.com pages (same-domain links,
excluding assets/feeds/admin) into a folder, for building the static test copy."""
import os, re, sys, time, urllib.request, urllib.parse, json

ROOT = 'https://vishvyatraholidays.com/'
OUT = sys.argv[1]
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 150
SKIP = re.compile(r'/(wp-content|wp-includes|wp-json|wp-admin|feed|comments|xmlrpc\.php|wp-login\.php)|\.(jpe?g|png|gif|webp|svg|pdf|zip|css|js|xml|ico)$|[?#]', re.I)

def norm(u):
    u = urllib.parse.urljoin(ROOT, u.split('#')[0])
    p = urllib.parse.urlparse(u)
    if p.netloc not in ('vishvyatraholidays.com', 'www.vishvyatraholidays.com') or p.query:
        return None
    path = p.path if p.path.endswith('/') else p.path + '/'
    return None if SKIP.search(p.path) else path

seen, queue, pages = set(), ['/'], {}
while queue and len(pages) < LIMIT:
    path = queue.pop(0)
    if path in seen:
        continue
    seen.add(path)
    try:
        req = urllib.request.Request(ROOT.rstrip('/') + path, headers={'User-Agent': 'Mozilla/5.0 (NTX test-copy builder)'})
        with urllib.request.urlopen(req, timeout=40) as r:
            if r.status != 200:
                continue
            html = r.read().decode('utf-8', 'replace')
    except Exception as e:
        print('skip', path, e)
        continue
    pages[path] = True
    dest = os.path.join(OUT, path.strip('/'), 'index.html') if path != '/' else os.path.join(OUT, 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(html)
    for href in re.findall(r'href=["\']([^"\']+)["\']', html):
        n = norm(href)
        if n and n not in seen:
            queue.append(n)
    time.sleep(0.3)
json.dump(sorted(pages), open(os.path.join(OUT, '_pages.json'), 'w'), indent=1)
print(len(pages), 'pages saved')
