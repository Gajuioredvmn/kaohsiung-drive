import pathlib
root = pathlib.Path(__file__).resolve().parent
head = (root / 'src/head.html').read_text(encoding='utf-8')
body = (root / 'src/body.html').read_text(encoding='utf-8')
three = (root / 'vendor/three.global.js').read_text(encoding='utf-8')
js = '\n'.join(p.read_text(encoding='utf-8') for p in sorted((root / 'src/js').glob('*.js')))
script = "(function(){'use strict';\n" + js + "\nboot();\n})();"
meta = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
page = '<!doctype html><html lang="zh-Hant"><head>' + meta + head + '</head><body>' + body + '<script>' + three + '</script><script>\n' + script + '\n</script></body></html>\n'
(root / 'dist').mkdir(exist_ok=True); (root / 'test').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(page, encoding='utf-8')
(root / 'test/index.html').write_text(page, encoding='utf-8')
print('built', len(script), 'chars of script,', len(page) // 1024, 'KB page')
