"""Xiangqi Council 入口。"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.online import router as rooms_router
from src.api.routes import router


app = FastAPI(
    title="Xiangqi Council",
    description="中国象棋对弈、学习、联机与多智能体棋评",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(rooms_router, prefix="/api")

frontend = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")


def main() -> None:
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8200")),
        reload=os.getenv("RELOAD", "0") == "1",
    )


if __name__ == "__main__":
    main()
