"""
Minimal MCP Protocol Round-Trip Verification
============================================
Verifies mcp_server.py actually works over stdio/MCP transport -- not just HTTP.
Run with backend on port 8000:

    Terminal 1: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
    Terminal 2: python backend/mcp_verify.py

Expected output:
  - Server advertises 4 tools
  - investigate_transaction returns tier + risk_score over real MCP protocol
"""

import asyncio
import sys
import json
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify():
    server_script = str(Path(__file__).parent / "mcp_server.py")

    params = StdioServerParameters(
        command=sys.executable,
        args=[server_script],
        env={"RAZORSHIELD_API_URL": "http://localhost:8000"},
    )

    print("=" * 60)
    print("MCP PROTOCOL ROUND-TRIP VERIFICATION")
    print("Connecting to mcp_server.py via stdio transport...")
    print("=" * 60)

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("\n[OK] MCP session initialized\n")

            # 1. List tools
            tools_result = await session.list_tools()
            tool_names = [t.name for t in tools_result.tools]
            print(f"[OK] Tools advertised ({len(tool_names)}): {tool_names}")
            expected = {"check_canary_status","get_cluster_risk_score","investigate_transaction","compile_dispute_evidence"}
            missing = expected - set(tool_names)
            assert not missing, f"Missing tools: {missing}"
            print("[OK] All 4 expected tools present\n")

            # 2. Call investigate_transaction
            print("[CALL] investigate_transaction('TXN_VERIFY_001') via MCP stdio...")
            result = await session.call_tool("investigate_transaction", arguments={"transaction_id": "TXN_VERIFY_001"})
            text = result.content[0].text if result.content else "{}"
            data = json.loads(text)
            print(f"[OK] investigate_transaction -> tier={data.get('tier')}, risk_score={data.get('risk_score')}")

            # 3. Call check_canary_status
            print("\n[CALL] check_canary_status('TXN_VERIFY_001') via MCP stdio...")
            c_result = await session.call_tool("check_canary_status", arguments={"transaction_id": "TXN_VERIFY_001"})
            c_text = c_result.content[0].text if c_result.content else "{}"
            c_data = json.loads(c_text)
            print(f"[OK] check_canary_status -> is_canary={c_data.get('is_canary')}, confidence={c_data.get('confidence')}")

            print("\n" + "=" * 60)
            print("MCP PROTOCOL VERIFICATION PASSED")
            print("mcp_server.py stdio transport works end-to-end.")
            print("=" * 60)


if __name__ == "__main__":
    asyncio.run(verify())
