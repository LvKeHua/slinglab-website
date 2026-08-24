"""Tokenomics Screener - 纯静态文件服务器
只读取本地 data.json，不出站请求
"""
import http.server
import json
import os

PORT = 3000
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/data':
            return self.serve_data()
        return super().do_GET()

    def serve_data(self):
        data_path = os.path.join(DIR, 'data.json')
        if not os.path.exists(data_path):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': False, 'error': 'data.json not found'}).encode())
            return
        with open(data_path, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(content)

if __name__ == '__main__':
    os.chdir(DIR)
    server = http.server.HTTPServer(('0.0.0.0', PORT), Handler)
    print(f'Tokenomics Screener running at http://localhost:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
