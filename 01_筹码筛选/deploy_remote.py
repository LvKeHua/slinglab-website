"""
Deploy 筹码筛选 (Crypto Screener) to RackNerd VPS
Tunnels SSH through HTTP proxy (required due to network restrictions)
Usage: python deploy_remote.py
"""
import paramiko
import os
import socket
import ssl
import time

VPS_IP = "192.255.193.128"
VPS_USER = "root"
VPS_PASS = "7Jj6Mz80BcArGxE3m7"
VPS_PORT = 22
PROXY_HOST = "127.0.0.1"
PROXY_PORT = 7897
REMOTE_DIR = "/opt/screener"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))


def create_proxy_socket(host, port, proxy_host, proxy_port):
    """Create a socket tunneled through an HTTP CONNECT proxy."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    sock.connect((proxy_host, proxy_port))
    # Send HTTP CONNECT request
    connect_req = f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n\r\n"
    sock.sendall(connect_req.encode())
    # Read response
    response = b""
    while b"\r\n\r\n" not in response:
        chunk = sock.recv(4096)
        if not chunk:
            break
        response += chunk
    status_line = response.split(b"\r\n")[0].decode()
    if "200" not in status_line:
        raise ConnectionError(f"Proxy CONNECT failed: {status_line}")
    return sock


def run_ssh(client, cmd, timeout=30):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        for line in out.split("\n"):
            print(f"    {line}")
    if err and exit_status != 0:
        for line in err.split("\n"):
            print(f"    [ERR] {line}")
    return exit_status, out, err


def main():
    print("=== Deploying Crypto Screener to VPS ===\n")
    print(f"Connecting via proxy {PROXY_HOST}:{PROXY_PORT} → {VPS_IP}:{VPS_PORT} ...\n")

    # Create tunnel socket through HTTP proxy
    sock = create_proxy_socket(VPS_IP, VPS_PORT, PROXY_HOST, PROXY_PORT)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASS,
        sock=sock, timeout=30, auth_timeout=30,
    )
    print("✓ Connected to VPS via proxy tunnel\n")

    # Step 1: Create remote directory structure
    print("[1/6] Creating remote directory structure...")
    for d in ["backend", "frontend", "data", "deploy"]:
        run_ssh(client, f"mkdir -p {REMOTE_DIR}/{d}")

    # Step 2: Upload project files via SFTP
    print("\n[2/6] Uploading project files...")
    sftp = client.open_sftp()

    def upload_dir(local, remote):
        for item in os.listdir(local):
            local_path = os.path.join(local, item)
            remote_path = f"{remote}/{item}"
            if os.path.isfile(local_path):
                sftp.put(local_path, remote_path)
                print(f"    -> {remote_path}")
            elif os.path.isdir(local_path) and item != "__pycache__":
                try:
                    sftp.stat(remote_path)
                except FileNotFoundError:
                    sftp.mkdir(remote_path)
                upload_dir(local_path, remote_path)

    upload_dir(os.path.join(LOCAL_DIR, "backend"), f"{REMOTE_DIR}/backend")
    upload_dir(os.path.join(LOCAL_DIR, "frontend"), f"{REMOTE_DIR}/frontend")
    sftp.put(os.path.join(LOCAL_DIR, "requirements.txt"), f"{REMOTE_DIR}/requirements.txt")
    print(f"    -> {REMOTE_DIR}/requirements.txt")
    upload_dir(os.path.join(LOCAL_DIR, "deploy"), f"{REMOTE_DIR}/deploy")
    sftp.close()

    # Step 3: Install Python dependencies
    print("\n[3/6] Installing Python dependencies...")
    run_ssh(client, f"cd {REMOTE_DIR} && pip3 install -r requirements.txt", timeout=60)

    # Step 4: Setup systemd service
    print("\n[4/6] Setting up systemd service...")
    run_ssh(client, f"cp {REMOTE_DIR}/deploy/screener.service /etc/systemd/system/screener.service")
    run_ssh(client, "systemctl daemon-reload")
    run_ssh(client, "systemctl enable screener")
    run_ssh(client, "systemctl restart screener")
    time.sleep(2)
    run_ssh(client, "systemctl status screener --no-pager")

    # Step 5: Configure nginx
    print("\n[5/6] Configuring nginx routing...")
    rc, out, _ = run_ssh(client, "grep -c 'location /screener/' /etc/nginx/sites-available/runnerxbt || true")
    already_configured = False
    for line in out.split("\n"):
        if line.strip().isdigit() and int(line.strip()) > 0:
            already_configured = True
    if not already_configured:
        nginx_block = (
            "\n    # Screener module (筹码筛选)\n"
            "    location /screener/ {\n"
            "        proxy_pass http://127.0.0.1:8001/;\n"
            "        proxy_set_header Host $host;\n"
            "        proxy_set_header X-Real-IP $remote_addr;\n"
            "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
            "        proxy_set_header X-Forwarded-Proto $scheme;\n"
            "    }\n"
        )
        # Escape $ signs for sed
        escaped = nginx_block.replace("$", "\\$")
        run_ssh(client, f"sed -i '/^}}/i\\{escaped}' /etc/nginx/sites-available/runnerxbt")
        run_ssh(client, "systemctl reload nginx")
        print("    ✓ Nginx reloaded with screener route")
    else:
        print("    ✓ Screener location already exists in nginx config")

    # Step 6: Update landing page
    print("\n[6/6] Updating landing page...")
    landing = "/opt/runnerxbt/landing/index.html"
    rc, out, _ = run_ssh(client, f"test -f {landing} && echo 'EXISTS' || echo 'NOTFOUND'")
    if "EXISTS" in out:
        rc2, out2, _ = run_ssh(client, f"grep -c 'screener' {landing} || true")
        link_exists = any(line.strip().isdigit() and int(line.strip()) > 0 for line in out2.split("\n"))
        if not link_exists:
            run_ssh(client,
                f"sed -i 's|<a href=\"/r|\\n    <a href=\"/screener/\" class=\"nav-link\">筹码筛选</a>\\n    <a href=\"/r|' {landing}")
            print("    ✓ Landing page updated with screener link")
        else:
            print("    ✓ Screener link already exists on landing page")
    else:
        print("    - Landing page not found, skipping")

    # Final verification
    print("\n[VERIFY] Testing the service...")
    run_ssh(client, "curl -s http://127.0.0.1:8001/api/status | head -c 200")
    run_ssh(client, "curl -s -o /dev/null -w 'Frontend: HTTP %{http_code}' http://127.0.0.1:8001/")

    print("\n\n═══════════════════════════════════════")
    print("  ✅  Deployment Complete!")
    print("═══════════════════════════════════════")
    print(f"  URL:     https://app.slinglab.xyz/screener/")
    print(f"  Status:  systemctl status screener")
    print(f"  Logs:    journalctl -u screener -f")
    print(f"  Nginx:   systemctl status nginx")
    print("═══════════════════════════════════════\n")

    client.close()


if __name__ == "__main__":
    main()
