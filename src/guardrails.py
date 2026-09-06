"""简易滑动窗口限流（演示级）。"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

_lock = Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)

_EXPENSIVE = (
    "/api/game/ai-step",
    "/api/game/analyze-position",
    "/api/rooms",
)


def check_rate_limit(request: Request, *, window: int = 60, burst: int = 120) -> None:
    path = request.url.path
    if not path.startswith("/api/"):
        return
    if path == "/api/health":
        return
    ip = "unknown"
    forwarded = request.headers.get("x-forwarded-for") or ""
    if forwarded:
        ip = forwarded.split(",")[0].strip() or ip
    elif request.client:
        ip = request.client.host or ip
    limit = max(1, burst // 3) if any(path.startswith(p) for p in _EXPENSIVE) else burst
    key = f"{ip}:{path.split('/')[2] if path.count('/') >= 2 else path}"
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
        q.append(now)
