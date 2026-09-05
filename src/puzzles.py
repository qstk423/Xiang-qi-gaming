"""残局 / 战术题库。"""
from __future__ import annotations

PUZZLES = [
    {
        "id": "mate_in_1_rook",
        "title": "单车绝杀",
        "goal": "红方一步杀",
        "difficulty": 1,
        "side": "red",
        "fen": "3k5/9/9/9/9/9/9/9/9/R3K4 w - - 0 1",
        "solution": ["a0d0"],
        "hint": "车平到将的直线，锁死九宫。",
    },
    {
        "id": "mate_in_1_cannon",
        "title": "重炮杀",
        "goal": "红方一步杀",
        "difficulty": 1,
        "side": "red",
        "fen": "4k4/9/4C4/9/9/9/9/9/4C4/4K4 w - - 0 1",
        "solution": ["e1e9"],
        "hint": "后炮借前炮架沉底。",
    },
    {
        "id": "capture_horse",
        "title": "卧槽捉马",
        "goal": "红方吃掉黑马",
        "difficulty": 2,
        "side": "red",
        "fen": "3k5/9/1n7/9/2N6/9/9/9/9/4K4 w - - 0 1",
        "solution": ["c5b7"],
        "hint": "马跳到黑马可吃位置。",
    },
    {
        "id": "defend_check",
        "title": "应将",
        "goal": "黑方应将",
        "difficulty": 2,
        "side": "black",
        "fen": "3k5/9/9/9/9/9/9/9/9/3R1K3 b - - 0 1",
        "solution": ["d9e9"],
        "hint": "将离开车的直线（避开对面帅的照面）。",
    },
    {
        "id": "pawn_advance",
        "title": "高兵逼宫",
        "goal": "红方横移高兵",
        "difficulty": 1,
        "side": "red",
        "fen": "3k5/4P4/9/9/9/9/9/9/9/4K4 w - - 0 1",
        "solution": ["e8d8", "e8f8"],
        "hint": "过河兵可左右平移。",
    },
]


def list_puzzles() -> list[dict]:
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "goal": p["goal"],
            "difficulty": p["difficulty"],
            "side": p["side"],
            "hint": p["hint"],
        }
        for p in PUZZLES
    ]


def get_puzzle(puzzle_id: str) -> dict | None:
    for p in PUZZLES:
        if p["id"] == puzzle_id:
            return p
    return None
