import re

with open('main.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import sqlite3', 'import aiosqlite\nimport sqlite3\nimport asyncio')

startup = '''
db_conn = None

@app.on_event("startup")
async def startup():
    global db_conn
    db_conn = await aiosqlite.connect(DB_PATH)
    await db_conn.execute("PRAGMA journal_mode=WAL;")
'''

text = text.replace('conn = sqlite3.connect(DB_PATH, check_same_thread=False)', 'conn = sqlite3.connect(DB_PATH, check_same_thread=False)\n' + startup)

# ONLY transform the endpoints explicitly requested by rewriting them, OR bulk change endpoints via Regex:
# To fix module-level awaits, simply DO NOT replace cursor.execute with await cursor.execute globally!
# Find all occurrences of `@app... def ` and change it to async def.
text = re.sub(r'(@app\.[a-z]+\(.*?\)\n(?:@[^\n]+\n)*)def ', r'\1async def ', text)

# Also fix the background tasks worker
text = re.sub(r'def generate_role_data_worker', r'async def generate_role_data_worker', text)
text = re.sub(r'background_tasks\.add_task\(\s*generate_role_data_worker', r'import asyncio\n    asyncio.create_task(generate_role_data_worker', text)


# Within async def functions only, replace db ops!
def replacer(body_str):
    body = body_str
    body = body.replace('cur.execute', 'await cur.execute')
    body = body.replace('cur.executemany', 'await cur.executemany')
    body = body.replace('cur.fetchone', 'await cur.fetchone')
    body = body.replace('cur.fetchall', 'await cur.fetchall')
    body = body.replace('conn.commit()', 'await db_conn.commit()')
    body = body.replace('cur = get_cursor()', 'cur = await db_conn.cursor()')
    body = body.replace('db.commit()', 'await db_conn.commit()')
    return body

# Split into functions using regex
pieces = re.split(r'(?<=^)(async def .*?(?=\n\S|\Z))', text, flags=re.MULTILINE | re.DOTALL)
for i in range(1, len(pieces), 2):
    pieces[i] = replacer(pieces[i])

new_text = ''.join(pieces)

with open('main_async.py', 'w', encoding='utf-8') as f:
    f.write(new_text)
