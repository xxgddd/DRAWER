import paramiko
import sys
import os

HOST = "139.180.218.162"
USER = "root"
PASS = "jL]9MN@Xi*,T9HwH"

# The local paths we want to upload
local_files = [
    r"c:\Users\G CLEF\eve_bot\Ombre-Brain2\server.py",
    r"c:\Users\G CLEF\eve_bot\Ombre-Brain2\bucket_manager.py"
]

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)
        
    print("Finding ombre-brain service working directory...")
    stdin, stdout, stderr = ssh.exec_command("grep WorkingDirectory /etc/systemd/system/ombre*.service /lib/systemd/system/ombre*.service 2>/dev/null")
    output = stdout.read().decode('utf-8').strip()
    
    remote_dir = ""
    if output:
        # e.g. /etc/systemd/system/ombre-brain.service:WorkingDirectory=/opt/Ombre-Brain2
        parts = output.split("=")
        if len(parts) >= 2:
            remote_dir = parts[1].strip()
            
    if not remote_dir:
        print("Could not find WorkingDirectory in service files. Let's try finding server.py...")
        stdin, stdout, stderr = ssh.exec_command("find /opt /root -name server.py -path '*/Ombre-Brain2/*' 2>/dev/null | head -n 1")
        output = stdout.read().decode('utf-8').strip()
        if output:
            remote_dir = os.path.dirname(output)
            
    if not remote_dir:
        print("Could not locate remote Ombre Brain directory.")
        sys.exit(1)
        
    print(f"Found remote directory: {remote_dir}")
    
    print("Uploading files...")
    sftp = ssh.open_sftp()
    for local_file in local_files:
        filename = os.path.basename(local_file)
        remote_path = f"{remote_dir}/{filename}"
        print(f"Uploading {local_file} -> {remote_path}")
        sftp.put(local_file, remote_path)
    sftp.close()
    
    print("Restarting ombre-brain service...")
    stdin, stdout, stderr = ssh.exec_command("systemctl restart ombre-brain || systemctl restart ombre")
    err = stderr.read().decode('utf-8')
    if err:
        print(f"Restart warning/error: {err}")
    else:
        print("Restarted successfully.")
        
    ssh.close()
    print("Done!")

if __name__ == "__main__":
    main()
