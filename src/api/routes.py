"""对弈 / AI / 残局 / FEN API。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.ai import choose_move
from src.council import analyze_position
from src.puzzles import get_puzzle, list_puzzles
from src.rules import START_FEN, XiangqiGame, Move, legal_targets, parse_fen

router = APIRouter()
game = XiangqiGame()


class NewGameRequest(BaseModel):
    mode: str = "human_vs_human"
    human_color: str = "red"
    fen: str | None = None


class MoveRequest(BaseModel):
    uci: str


class FenRequest(BaseModel):
    fen: str


class TargetsRequest(BaseModel):
    square: str = Field(description="如 e3")


def _state(**extra):
    data = game.snapshot()
    data.update(extra)
    return data


@router.get("/health")
def health():
    return {
        "status": "ok",
        "product": "Xiangqi Council",
        "version": "0.2.0",
        "engine": "builtin_minimax",
        "council": "heuristic_v1",
        "rules": "complete_mvp",
    }


@router.get("/capabilities")
def capabilities():
    return {
        "ready": [
            "rules_engine",
            "local_play",
            "human_vs_ai",
            "undo",
            "legal_highlights",
            "check_detect",
            "puzzles",
            "fen_tools",
            "online_rooms",
            "council_analyze",
        ],
        "planned": ["pikafish", "llm_debate", "opening_book", "accounts"],
    }


class AnalyzeRequest(BaseModel):
    with_analysis: bool = True


@router.post("/game/new")
def new_game(req: NewGameRequest | None = None):
    req = req or NewGameRequest()
    fen = req.fen or START_FEN
    try:
        game.reset(fen)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    # 若指定执黑且人机，仍先返回局面；AI 由前端触发
    return _state(mode=req.mode, human_color=req.human_color)


@router.get("/game/state")
def game_state():
    return _state()


@router.post("/game/move")
def make_move(req: MoveRequest):
    try:
        entry = game.play_uci(req.uci)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _state(last_move=entry)


@router.post("/game/undo")
def undo_move():
    last = game.undo()
    if not last:
        raise HTTPException(400, "没有可悔的棋")
    return _state(undone=last)


@router.post("/game/ai-step")
def ai_step(depth: int = 2):
    if game.result:
        raise HTTPException(400, "对局已结束")
    depth = max(1, min(3, depth))
    uci = choose_move(game, depth=depth)
    if not uci:
        raise HTTPException(400, "无合法着法")
    entry = game.play_uci(uci)
    return _state(last_move=entry, ai=True)


@router.post("/game/targets")
def targets(req: TargetsRequest):
    sq = req.square.strip().lower()
    if len(sq) < 2:
        raise HTTPException(400, "格子编码错误")
    fc = ord(sq[0]) - 97
    fr = 9 - int(sq[1:])
    try:
        Move(fr, fc, fr, fc)  # validate ranges indirectly
    except Exception as exc:
        raise HTTPException(400, "格子编码错误") from exc
    if not (0 <= fr < 10 and 0 <= fc < 9):
        raise HTTPException(400, "格子越界")
    pts = legal_targets(game.board, game.turn, fr, fc)
    return {
        "square": sq,
        "targets": [f"{chr(97 + c)}{9 - r}" for r, c in pts],
        "uci": [Move(fr, fc, r, c).uci for r, c in pts],
    }


@router.post("/game/load-fen")
def load_fen(req: FenRequest):
    try:
        parse_fen(req.fen)
        game.reset(req.fen)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _state()


@router.post("/game/analyze-position")
def analyze_pos(req: AnalyzeRequest | None = None):
    req = req or AnalyzeRequest()
    if not req.with_analysis:
        return {"status": "skipped", "state": game.snapshot()}
    council = analyze_position(game)
    return {"status": "ok", "state": game.snapshot(), "council": council, "analysis": {"council": council}}


@router.get("/puzzles")
def puzzles():
    return {"items": list_puzzles()}


@router.post("/puzzles/{puzzle_id}/load")
def load_puzzle(puzzle_id: str):
    puzzle = get_puzzle(puzzle_id)
    if not puzzle:
        raise HTTPException(404, "题目不存在")
    game.reset(puzzle["fen"])
    return _state(puzzle=puzzle)


@router.post("/puzzles/{puzzle_id}/check")
def check_puzzle(puzzle_id: str, req: MoveRequest):
    puzzle = get_puzzle(puzzle_id)
    if not puzzle:
        raise HTTPException(404, "题目不存在")
    ok = req.uci.lower() in [s.lower() for s in puzzle["solution"]]
    if ok:
        try:
            game.play_uci(req.uci)
        except ValueError:
            pass
    return {
        "correct": ok,
        "hint": puzzle["hint"] if not ok else "正确！",
        "state": game.snapshot(),
        "goal": puzzle["goal"],
    }
