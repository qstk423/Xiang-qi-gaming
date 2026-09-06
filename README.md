# Xiangqi Council

**多智能体辩论式中国象棋分析与对战系统。**

Xiangqi Council 是 [ChessCouncil](https://github.com/qstk423/chessmind) 的中国象棋姐妹项目：服务端裁定棋规、内置 AI 选着、输出与国际象棋侧同构的 Council 分析结果；Web 四页客户端负责对弈、学习、联机与 FEN 工具。目标是先把契约与产品壳做对，再替换为 [Pikafish](https://github.com/official-pikafish/Pikafish) / LLM。

| | |
|---|---|
| 仓库 | [github.com/qstk423/Xiang-qi-gaming](https://github.com/qstk423/Xiang-qi-gaming) |
| 姐妹项目 | [ChessCouncil / chessmind](https://github.com/qstk423/chessmind) |
| 默认端口 | `8200`（与 ChessCouncil 常用 `8000` 错开） |
| 版本 | `0.3.0` |

---

## 一句话定位

| 层级 | 职责 | 当前实现 |
|------|------|----------|
| Brain | 棋规、minimax AI、启发式 Council、房间、题库 | Python · FastAPI |
| Client | Canvas 棋盘、分析面板、四页导航 | Web（PC 优先，可同网手机访问） |

**有：** 可玩的规则引擎 MVP、人人 / 人机、残局 / 闯关、联机房间、会话隔离、pytest + CI + Docker。  
**没有：** Pikafish、真 LLM Council、账号体系、跨进程棋谱持久化、长将 / 长捉等竞赛级规则。

功能范围可参考 [ElephantChess](https://github.com/benckx/elephantchess)，但**不复制其源码**。

---

## 当前完成度（诚实口径）

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 棋规 MVP | ~82% | 走法、将军 / 应将、绝杀、困毙判负；非法 UCI / FEN 校验 |
| 内置 AI | ~58% | minimax 浅层搜索，演示级棋力 |
| Council | ~67% | 攻杀 / 局势 / 风险启发式；结构对齐 ChessCouncil |
| 残局题 | ~82% | 约 35+ 题；`solution` 为多答案 OR；支持 `solution_lines` 多步 |
| 闯关 | ~80% | 与谜题共用 `/puzzles/{id}/check`，须走出正解 |
| 联机 | ~68% | 邀请链 `?room=` 可无本地 token 加入；房间有 TTL / 上限 |
| 会话 | ~70% | `X-Session-Id` 内存隔离；重启丢失 |
| 测试 / 交付 | ~70% | pytest、CI、Dockerfile、简易限流 |

---

## 功能概览

### 对弈

- 人人练习、人机（执红 / 执黑）
- 点选 / 键盘光标走子、合法目标高亮、翻转、悔棋（恢复 halfmove）
- AI 一步、理事会提示、终局（绝杀 / 困毙）

### 象棋理事会

交互对齐 ChessCouncil：

- 评估条、三师卡片、教练 / 辩论标签
- 「分析局面」「走出推荐」
- 当前为规则启发式（`heuristic_v1`），**不是** LLM，也**不是** Pikafish 分数

### 学习 · 联机 · 工具

- **学习**：名局跟谱、残局 / 战术题、闯关
- **联机**：创建 / 加入房间，WebSocket 同步；复制 `index.html?room=房间号` 即可邀请
- **工具**：FEN 导入 / 导出

### 谜题约定

- `solution: ["a","b"]` → 多个可选正确答案，走中任一即通关  
- `solution_lines: [["a","opp","b"]]` → 多步变例；服务端只自动续走**对手**着法  
- 闯关加载后同样走 `POST /api/puzzles/{id}/check`

---

## 快速开始

```bash
git clone https://github.com/qstk423/Xiang-qi-gaming.git
cd Xiang-qi-gaming
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m src.main
```

打开 [http://127.0.0.1:8200](http://127.0.0.1:8200)

| 变量 | 默认 | 说明 |
|------|------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `8200` | 端口 |
| `RELOAD` | `0` | `1` 开启热重载 |
| `CORS_ORIGINS` | `*` | 公网请改为明确域名列表 |

### Docker

```bash
docker build -t xiangqi-council .
docker run --rm -p 8200:8200 xiangqi-council
```

### 测试

```bash
pytest -q
```

覆盖棋规、谜题 OR / `solution_lines`、会话隔离、邀请加入、非法坐标等。

---

## 仓库结构

```
src/
├── main.py           # FastAPI 入口 + 限流中间件
├── rules.py          # 棋规、FEN、XiangqiGame
├── ai.py             # 内置 minimax
├── council.py        # 启发式理事会
├── puzzles.py        # 残局题库
├── library.py        # 名局 / 闯关目录
├── sessions.py       # 浏览器会话隔离
├── rooms.py          # 联机房间（TTL / 上限）
├── guardrails.py     # 简易限流
└── api/
    ├── routes.py     # 对弈 / 分析 / 题库 / 闯关
    └── online.py     # 房间 REST + WebSocket
frontend/             # index / learn / online / tools
tests/                # test_rules / test_puzzles
Dockerfile
.github/workflows/ci.yml
```

---

## 主要 API

对弈相关请求请带 `X-Session-Id`。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查（`version` / `engine` / `council` / `sessions`） |
| `GET` | `/api/capabilities` | `ready` / `planned` |
| `POST` | `/api/game/new` | 新对局 |
| `GET` | `/api/game/state` | 当前局面 |
| `POST` | `/api/game/move` | 走子 |
| `POST` | `/api/game/undo` | 悔棋 |
| `POST` | `/api/game/ai-step` | AI 一步 |
| `POST` | `/api/game/targets` | 某格合法目标 |
| `POST` | `/api/game/load-fen` | 加载 FEN |
| `POST` | `/api/game/analyze-position` | 只分析，返回 `council` |
| `GET` | `/api/puzzles` | 题库 |
| `POST` | `/api/puzzles/{id}/load` | 加载题目 |
| `POST` | `/api/puzzles/{id}/check` | 校验着法 |
| `GET` | `/api/challenges` | 闯关列表 |
| `POST` | `/api/challenges/{id}/load` | 加载关卡 |
| `POST` | `/api/rooms` · `.../join` | 联机 |
| `WS` | `/api/rooms/{id}/ws?token=` | 实时同步 |

---

## 已知边界

1. 会话与房间均为**进程内内存**（会话 TTL ~6h；房间同样会过期清理），重启即失。
2. 棋规是 MVP：绝杀 / 困毙已实现；**长将 / 长捉 / 重复局面未实现**。
3. AI 与 Council 强度有限，请勿按职业引擎 / 大模型标准宣传。
4. CORS 默认 `*`，公网请收紧；房间 token 目前可出现在 WS query（演示级）。
5. 尚无账号、棋谱库持久化、大厅观战。

---

## 进度清单

- [x] 可交互棋盘、悔棋、翻转、键盘走子基础
- [x] 棋规 MVP（将军 / 绝杀 / 困毙）
- [x] 人机（内置 AI）+ 启发式 Council
- [x] 残局 / 闯关正解校验
- [x] 联机邀请链接自动加入
- [x] `X-Session-Id` 会话隔离
- [x] pytest + CI + Dockerfile + 限流
- [ ] Pikafish UCI 与引擎分
- [ ] LLM Council
- [ ] 长将 / 长捉 / 重复局面
- [ ] 棋谱持久化与赛后复盘
- [ ] 与 ChessCouncil 统一壳

---

## 路线图

1. 接入 Pikafish，替换 / 增强选着与评估  
2. Council 接入 LLM，对齐 ChessCouncil 辩论流水线  
3. 冻结 OpenAPI  
4. 棋谱持久化  
5. 合并双棋种：`game_type=chess|xiangqi`

---

## 许可证

[MIT](LICENSE)。若日后嵌入 [Pikafish](https://github.com/official-pikafish/Pikafish)（GPLv3），发行方式须同时满足其要求；当前默认发行物**不含** Pikafish 二进制。
