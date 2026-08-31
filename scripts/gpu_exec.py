import asyncio
import json
import sys
import httpx
import websockets

TOKEN = "2d1743a3308542c7beb1b61f769c124a9b08e7a04f09f851"
BASE_URL = "http://192.168.20.15:8888"
WS_URL = "ws://192.168.20.15:8888"

async def exec_remote(cmd_str: str, timeout_sec: float = 30.0) -> str:
    headers = {"Authorization": f"token {TOKEN}"}
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE_URL}/api/terminals", headers=headers)
        term_name = r.json()["name"]

    uri = f"{WS_URL}/terminals/websocket/{term_name}?token={TOKEN}"
    async with websockets.connect(uri) as ws:
        await asyncio.sleep(0.5)
        while True:
            try:
                await asyncio.wait_for(ws.recv(), timeout=0.2)
            except:
                break

        marker = f"__EXEC_DONE_{term_name}__"
        full_cmd = f"{cmd_str}\necho {marker}\n"
        await ws.send(json.dumps(["stdin", full_cmd]))

        output = []
        start_time = asyncio.get_event_loop().time()
        while True:
            if asyncio.get_event_loop().time() - start_time > timeout_sec:
                break
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                data = json.loads(raw)
                if data[0] == "stdout":
                    output.append(data[1])
                    if marker in data[1]:
                        break
            except asyncio.TimeoutError:
                pass

    async with httpx.AsyncClient() as client:
        await client.delete(f"{BASE_URL}/api/terminals/{term_name}", headers=headers)

    res = "".join(output)
    return res

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeout", type=float, default=60.0, help="Timeout in seconds")
    args, unknown = parser.parse_known_args()
    
    cmd_str = " ".join(unknown) if unknown else "nvidia-smi"
    out = asyncio.run(exec_remote(cmd_str, args.timeout))
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    sys.stdout.buffer.flush()
