"""规则引擎基础测试：困毙、FEN、UCI。"""
from __future__ import annotations

from unittest.mock import patch

import pytest

from src.rules import START_FEN, Move, XiangqiGame, parse_fen


def test_from_uci_rejects_bad():
    with pytest.raises(ValueError):
        Move.from_uci("z9z9")
    with pytest.raises(ValueError):
        Move.from_uci("e")
    with pytest.raises(ValueError):
        Move.from_uci("e2e9x")


def test_parse_fen_rejects_unknown_piece():
    bad = START_FEN.replace("R", "x", 1)
    with pytest.raises(ValueError, match="非法棋子"):
        parse_fen(bad)


def test_parse_fen_requires_kings():
    fen = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBA1ABNR w - - 0 1"
    with pytest.raises(ValueError, match="帅/将"):
        parse_fen(fen)


def test_stalemate_is_loss_not_draw():
    game = XiangqiGame()
    with patch("src.rules.legal_moves", return_value=[]), patch("src.rules.in_check", return_value=False):
        game._refresh_result()
    assert game.result is not None
    assert "困毙" in game.result
    assert "和" not in game.result


def test_undo_restores_halfmove():
    game = XiangqiGame()
    before = game.halfmove
    entry = game.play_uci("b0c2")
    assert game.halfmove == before + 1
    game.undo()
    assert game.halfmove == before
    assert "halfmove_before" in entry
