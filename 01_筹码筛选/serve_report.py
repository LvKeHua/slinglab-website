# -*- coding: utf-8 -*-
"""简易静态服务器：仅服务 report_factor_verification.html"""
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
PORT = 8768


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        p = os.path.join(BASE, 'report_factor_verification.html')
        with open(p, 'rb') as f:
            body = f.read()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    print(f'报告地址: http://127.0.0.1:{PORT}/')
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
