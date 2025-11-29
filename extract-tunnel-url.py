#!/usr/bin/env python3
"""
Extract tunnel URL from cloudflared container logs and write to .tunnel-url files.
This script monitors the cloudflared container logs and extracts the tunnel URL.
"""
import os
import re
import subprocess
import sys
import time

TUNNEL_URL_PATTERN = re.compile(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
CONTAINER_NAME = 'trailmix-cloudflared'
MAX_ATTEMPTS = 30
RETRY_DELAY = 2  # seconds

def extract_url_from_logs():
    """Extract tunnel URL from cloudflared container logs."""
    try:
        result = subprocess.run(
            ['docker', 'logs', CONTAINER_NAME],
            capture_output=True,
            text=True,
            check=False
        )
        
        # Search for URL in logs
        for line in result.stdout.split('\n'):
            match = TUNNEL_URL_PATTERN.search(line)
            if match:
                return match.group(0)
        
        # Also check stderr
        for line in result.stderr.split('\n'):
            match = TUNNEL_URL_PATTERN.search(line)
            if match:
                return match.group(0)
                
    except Exception as e:
        print(f"Error reading logs: {e}", file=sys.stderr)
    
    return None

def write_tunnel_url(url, output_paths):
    """Write tunnel URL to specified files."""
    for path in output_paths:
        try:
            os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
            with open(path, 'w') as f:
                f.write(url + '\n')
            print(f"Written tunnel URL to: {path}")
        except Exception as e:
            print(f"Error writing to {path}: {e}", file=sys.stderr)

def read_existing_url(path):
    """Read existing URL from file if it exists."""
    try:
        if os.path.exists(path):
            with open(path, 'r') as f:
                content = f.read().strip()
                if content:
                    return content
    except Exception:
        pass
    return None

def main():
    # Get output paths from environment or use defaults
    root_tunnel_url = os.getenv('ROOT_TUNNEL_URL_FILE', '/workspace/.tunnel-url')
    frontend_tunnel_url = os.getenv('FRONTEND_TUNNEL_URL_FILE', '/workspace/trailmix/.tunnel-url')
    
    output_paths = [root_tunnel_url, frontend_tunnel_url]
    last_url = None
    
    # Check if we already have a URL
    for path in output_paths:
        existing = read_existing_url(path)
        if existing:
            last_url = existing
            print(f"Found existing tunnel URL: {last_url}")
            break
    
    print(f"Monitoring {CONTAINER_NAME} for tunnel URL...")
    
    # Try to extract URL initially
    for attempt in range(MAX_ATTEMPTS):
        url = extract_url_from_logs()
        
        if url:
            # Only update if URL has changed
            if url != last_url:
                print(f"Found tunnel URL: {url}")
                write_tunnel_url(url, output_paths)
                last_url = url
            else:
                print(f"Tunnel URL unchanged: {url}")
            return 0
        
        if attempt < MAX_ATTEMPTS - 1:
            time.sleep(RETRY_DELAY)
    
    # If we had a previous URL, that's okay - cloudflared might still be starting
    if last_url:
        print(f"Could not extract new URL, but previous URL exists: {last_url}")
        return 0
    
    print(f"Failed to extract tunnel URL after {MAX_ATTEMPTS} attempts", file=sys.stderr)
    return 1

if __name__ == '__main__':
    sys.exit(main())

