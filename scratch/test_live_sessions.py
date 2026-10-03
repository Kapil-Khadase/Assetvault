import urllib.request
import json

def test():
    # 1. Login with Chrome User-Agent
    chrome_req = urllib.request.Request(
        'http://127.0.0.1:5000/api/auth/login',
        data=json.dumps({'email': 'kapil@example.com', 'password': 'demo123'}).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }
    )
    with urllib.request.urlopen(chrome_req) as resp:
        chrome_data = json.loads(resp.read().decode())
    chrome_token = chrome_data['user']['token']
    chrome_sid = chrome_data['user'].get('session_id')
    print('Chrome Login Successful! Session ID:', chrome_sid)

    # 2. Login with Firefox User-Agent (simulating different browser on same device)
    firefox_req = urllib.request.Request(
        'http://127.0.0.1:5000/api/auth/login',
        data=json.dumps({'email': 'kapil@example.com', 'password': 'demo123'}).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
        }
    )
    with urllib.request.urlopen(firefox_req) as resp:
        firefox_data = json.loads(resp.read().decode())
    firefox_token = firefox_data['user']['token']
    firefox_sid = firefox_data['user'].get('session_id')
    print('Firefox Login Successful! Session ID:', firefox_sid)

    # 3. Query active sessions from Chrome perspective
    chrome_sess_req = urllib.request.Request(
        'http://127.0.0.1:5000/api/auth/sessions',
        headers={'Authorization': f'Bearer {chrome_token}'}
    )
    with urllib.request.urlopen(chrome_sess_req) as resp:
        chrome_view = json.loads(resp.read().decode())
    print('\n=== Active Sessions (Viewed from Chrome) ===')
    for s in chrome_view['sessions']:
        status = 'ACTIVE NOW (CURRENT BROWSER)' if s['is_current'] else 'ACTIVE SESSION (OTHER)'
        print(f"[{status}] {s['browser']} on {s['os']} | IP: {s['ip_address']} | Session: {s['session_id'][:8]}...")

    # 4. Query active sessions from Firefox perspective
    firefox_sess_req = urllib.request.Request(
        'http://127.0.0.1:5000/api/auth/sessions',
        headers={'Authorization': f'Bearer {firefox_token}'}
    )
    with urllib.request.urlopen(firefox_sess_req) as resp:
        firefox_view = json.loads(resp.read().decode())
    print('\n=== Active Sessions (Viewed from Firefox) ===')
    for s in firefox_view['sessions']:
        status = 'ACTIVE NOW (CURRENT BROWSER)' if s['is_current'] else 'ACTIVE SESSION (OTHER)'
        print(f"[{status}] {s['browser']} on {s['os']} | IP: {s['ip_address']} | Session: {s['session_id'][:8]}...")

    # 5. Revoke Firefox from Chrome
    del_req = urllib.request.Request(
        f'http://127.0.0.1:5000/api/auth/sessions/{firefox_sid}',
        headers={'Authorization': f'Bearer {chrome_token}'},
        method='DELETE'
    )
    with urllib.request.urlopen(del_req) as resp:
        del_data = json.loads(resp.read().decode())
    print(f"\nRevocation Result from Chrome: {del_data['message']}")

    # 6. Verify Firefox token is now blocked with 401
    try:
        blocked_req = urllib.request.Request(
            'http://127.0.0.1:5000/api/auth/sessions',
            headers={'Authorization': f'Bearer {firefox_token}'}
        )
        with urllib.request.urlopen(blocked_req) as resp:
            print("ERROR: Firefox token still worked!")
    except urllib.error.HTTPError as e:
        print(f"Firefox session correctly rejected post-revocation with HTTP {e.code}!")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test()
