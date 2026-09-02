import json
import urllib.request
import uuid
import time
import websocket

TOKEN = "2d1743a3308542c7beb1b61f769c124a9b08e7a04f09f851"
BASE_HTTP = "http://bd216server3:8888"
BASE_WS = "ws://bd216server3:8888"

kernel_url = f"{BASE_HTTP}/api/kernels"
req = urllib.request.Request(
    kernel_url,
    data=json.dumps({"name": "torch_gpu_env"}).encode("utf-8"),
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    kernel_id = json.loads(resp.read().decode())["id"]

print(f"[Launcher] Attached to kernel {kernel_id}")
ws = websocket.create_connection(f"{BASE_WS}/api/kernels/{kernel_id}/channels?token={TOKEN}", timeout=None)

cmd = "exec(open('/home/big/razorshield_gpu/train_100k_heavy.py').read())"
msg_id = str(uuid.uuid4())
exec_msg = {
    "header": {"msg_id": msg_id, "username": "big", "session": str(uuid.uuid4()), "msg_type": "execute_request", "version": "5.3"},
    "metadata": {},
    "content": {"code": cmd, "silent": False, "store_history": True, "user_expressions": {}, "allow_stdin": False},
    "buffers": [],
    "parent_header": {},
    "channel": "shell"
}
ws.send(json.dumps(exec_msg))

t_end = time.time() + 600
try:
    while time.time() < t_end:
        raw = ws.recv()
        msg = json.loads(raw)
        m_type = msg.get("header", {}).get("msg_type")
        if m_type == "stream":
            print(msg.get("content", {}).get("text", ""), end="", flush=True)
        elif m_type == "error":
            print("ERROR:", msg.get("content", {}).get("evalue", ""))
            print("\n".join(msg.get("content", {}).get("traceback", [])))
            break
        elif m_type == "execute_reply":
            status = msg.get("content", {}).get("status")
            print(f"\n[Launcher] Execution finished with status: {status}")
            break
finally:
    ws.close()
    del_req = urllib.request.Request(f"{kernel_url}/{kernel_id}", headers={"Authorization": f"token {TOKEN}"}, method="DELETE")
    try:
        urllib.request.urlopen(del_req)
    except:
        pass
