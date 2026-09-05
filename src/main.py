"""Xiangqi Council 基础服务。"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


app = FastAPI(
    title="Xiangqi Council",
    description="中国象棋对弈、学习、联机与多智能体棋评",
    version="0.1.0",
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "product": "Xiangqi Council",
        "version": app.version,
        "engine": "not_configured",
        "council": "scaffold",
    }


@app.get("/api/capabilities")
def capabilities() -> dict:
    return {
        "ready": ["local_board", "move_history", "board_flip", "responsive_pc_shell"],
        "planned": [
            "rules_engine",
            "pikafish",
            "council",
            "analysis_board",
            "puzzles",
            "online_rooms",
            "accounts",
        ],
    }


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
