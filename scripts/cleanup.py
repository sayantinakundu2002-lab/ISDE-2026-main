# scripts/cleanup.py
import os
import sys
import subprocess
import json

ports = [8000, 5173, 5174]

def get_ports_pids():
    pids = set()
    for port in ports:
        if sys.platform.startswith('win'):
            try:
                output = subprocess.check_output(
                    f'netstat -aon', 
                    shell=True
                ).decode('utf-8', errors='ignore')
                for line in output.strip().split('\n'):
                    if f':{port}' in line:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            pid = parts[-1]
                            if pid and pid != '0':
                                pids.add(int(pid))
            except Exception:
                pass
        else:
            try:
                output = subprocess.check_output(
                    f'lsof -t -i:{port}', 
                    shell=True
                ).decode('utf-8', errors='ignore')
                for pid in output.strip().split('\n'):
                    if pid.strip():
                        pids.add(int(pid.strip()))
            except Exception:
                pass
    return list(pids)

def kill_pids(pids_to_kill):
    for pid in pids_to_kill:
        try:
            if sys.platform.startswith('win'):
                print(f"Port cleanup: Killing process {pid} (Windows)")
                subprocess.run(f'taskkill /F /T /PID {pid}', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                print(f"Port cleanup: Killing process {pid} (Unix)")
                subprocess.run(f'kill -9 {pid}', shell=True)
        except Exception:
            pass

def clean_orphaned_windows_python_processes(parent_pids):
    if not sys.platform.startswith('win'):
        return
    try:
        # Query Win32_Process via PowerShell to find spawned python processes
        cmd = 'powershell -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'python.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"'
        output = subprocess.check_output(cmd, shell=True).decode('utf-8', errors='ignore').strip()
        if not output:
            return
        
        try:
            data = json.loads(output)
        except json.JSONDecodeError:
            return
        
        if isinstance(data, dict):
            data = [data]
            
        spawn_children = []
        for proc in data:
            cmdline = proc.get('CommandLine', '') or ''
            pid = proc.get('ProcessId')
            if pid is None:
                continue
                
            # If the process is a python spawn worker
            if 'spawn_main' in cmdline:
                # Check if it lists any of our parent PIDs
                for parent_pid in parent_pids:
                    if f'parent_pid={parent_pid}' in cmdline:
                        spawn_children.append(pid)
                        
        if spawn_children:
            print(f"Port cleanup: Found orphaned python subprocesses {spawn_children}")
            kill_pids(spawn_children)
    except Exception as e:
        pass

def main():
    # 1. Get primary PIDs listening on our target ports
    primary_pids = get_ports_pids()
    if not primary_pids:
        print("Port cleanup: No active processes found on ports 8000, 5173, 5174.")
        return
        
    print(f"Port cleanup: Active PIDs on target ports: {primary_pids}")
    
    # 2. On Windows, find and clean up any multiprocessing python child processes
    # that were spawned by these PIDs
    clean_orphaned_windows_python_processes(primary_pids)
    
    # 3. Kill the primary PIDs
    kill_pids(primary_pids)

if __name__ == '__main__':
    main()
