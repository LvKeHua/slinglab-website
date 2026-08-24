#!/usr/bin/env python3
"""Update GitHub Actions secret with encrypted value.
Usage: python secret_updater.py <repo> <secret_name> <secret_value> <gh_token>
"""
import base64
import json
import sys
import urllib.request

def api_get(url, token):
    req = urllib.request.Request(url, headers={
        'Authorization': f'token {token}',
        'User-Agent': 'runnerxbt-sync',
    })
    return json.loads(urllib.request.urlopen(req).read())

def api_put(url, data, token):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method='PUT', headers={
        'Authorization': f'token {token}',
        'User-Agent': 'runnerxbt-sync',
        'Content-Type': 'application/json',
    })
    resp = urllib.request.urlopen(req)
    raw = resp.read()
    # PUT 成功返回 204 No Content
    if not raw:
        return {'success': True}
    return json.loads(raw)

def main():
    if len(sys.argv) < 5:
        print('Usage: secret_updater.py <repo> <secret_name> <secret_value> <gh_token>')
        return 1
    repo, secret_name, secret_value, gh_token = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

    # 1. Get public key
    enc = api_get(
        f'https://api.github.com/repos/{repo}/actions/secrets/public-key',
        gh_token
    )
    key_id = enc['key_id']
    key = enc['key']

    # 2. Encrypt with libsodium sealed box
    from nacl import encoding, public
    pub = public.PublicKey(base64.b64decode(key))
    sealed = public.SealedBox(pub).encrypt(secret_value.encode('utf-8'))
    encrypted = base64.b64encode(sealed).decode('utf-8')

    # 3. PUT the secret
    result = api_put(
        f'https://api.github.com/repos/{repo}/actions/secrets/{secret_name}',
        {'encrypted_value': encrypted, 'key_id': key_id},
        gh_token
    )
    print(f'Secret {secret_name} updated successfully')
    return 0

if __name__ == '__main__':
    sys.exit(main())
