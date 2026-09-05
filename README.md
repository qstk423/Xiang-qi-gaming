# Xiangqi Council

**多智能体辩论式中国象棋分析与对战系统。**

Xiangqi Council 提供中国象棋对局、局面分析与联机演示能力：服务端负责棋规、选着与理事会（Council）分析，Web 客户端负责棋盘交互与结果呈现。产品信息架构与 [ChessCouncil](https://github.com/qstk423/chessmind)（国际象棋侧）对齐，便于日后合并为双棋种产品。

- 仓库：[github.com/qstk423/Xiang-qi-gaming](https://github.com/qstk423/Xiang-qi-gaming)
- 姐妹项目：[ChessCouncil / chessmind](https://github.com/qstk423/chessmind)
- 目标引擎参考：[Pikafish](https://github.com/official-pikafish/Pikafish)（尚未接入）

---

## 概述

Xiangqi Council 不是「又一个只有棋盘的前端页面」，而是一套 **API 优先** 的象棋产品骨架：

| 层级 | 职责 | 当前实现 |
|------|------|----------|
| Brain（服务端） | 棋规裁定、人机选着、Council 分析、房间与题库 | Python · FastAPI |
| Client（客户端） | 棋盘、着法记录、分析面板、四页导航 | PC 优先 Web |

**它包含：**

- 可运行的 Web 对弈界面（人人 / 人机）
- 服务端完整棋规 MVP（合法着法、将军 / 应将、绝杀 / 困毙等）
- 与 ChessCouncil 同构的 Council 交互（评估条、三师、辩论标签、走出推荐）
- 残局题、FEN 工具、WebSocket 联机房间

**它目前不包含：**

- [Pikafish](https://github.com/official-pikafish/Pikafish) 或其它 UCI 引擎进程（人机与评估现为内置 minimax / 启发式）
- 大模型（LLM）级辩论（Council 文案现为规则启发式，`heuristic_v1`）
- 账号、持久化棋谱库、大厅观战、手机原生客户端

这些边界是刻意的：先把契约与产品壳做对，再替换 Brain 中的引擎与模型，而不推翻前端。

> 功能范围可参考 [ElephantChess](https://github.com/benckx/elephantchess)，但 **不复制其源码**，也不以之作为代码底座。

---

## 设计原则

1. **API 优先** — 能力经 HTTP / WebSocket 暴露；网页只是第一个客户端。
2. **规则在服务端** — 合法着法、将军、胜负由后端裁定，前端不做「半套棋规」。
3. **与 ChessCouncil 同构** — 对弈 / 学习 / 联机 / 工具四入口；Council 字段形态刻意贴近，便于共用组件。
4. **可降级、可替换** — 无 Pikafish、无 LLM Key 时仍可完整体验当前 MVP；日后可替换引擎与辩论实现。
5. **许可证清晰** — 本仓库 MIT；接入 GPL 引擎（如 Pikafish）时须单独遵守其条款并保留来源说明。

分析流水线（当前实现）：

```
棋盘点击 / 残局加载 / 联机房间
            ↓
     象棋 FEN + XiangqiRules
            ↓
     内置 AI（minimax）选着
            ↓
   攻杀 · 局势 · 风险（启发式并行）
            ↓
        分歧检测
       ↙        ↘
   共识裁决    辩论 → 仲裁
            ↓
        教练讲解
            ↓
          Web 客户端
```

---

## 功能说明

### 对弈

- 人人练习、人机对弈（可执红 / 执黑）
- Canvas 棋盘：点选走子、合法目标高亮、上一步高亮、翻转、悔棋
- AI 一步、提示（理事会推荐）、终局提示（绝杀 / 困毙）

### 象棋理事会

交互形态对齐 ChessCouncil：

- 红黑评估条与局面标签
- 攻杀 / 局势 / 风险三位分析师（卡片可点；再点可走出该推荐）
- 教练 / 攻杀 / 局势 / 风险 / 辩论标签页
- 「分析局面」「走后分析」「走出推荐」
- 争议度；分歧足够时展开辩论文案与仲裁

当前 Council 为规则启发式，**不是** LLM 辩论；评估 **不是** Pikafish 分数。

### 学习 · 联机 · 工具

- **学习**：残局 / 战术题，加载后进入对弈页推演
- **联机**：房间码创建 / 加入，WebSocket 同步（适合同网演示）
- **工具**：FEN 导入 / 导出

---

## 发行内容

本仓库主要包含：

| 路径 | 说明 |
|------|------|
| [`README.md`](README.md) | 本文件 |
| [`LICENSE`](LICENSE) | MIT 许可证正文 |
| [`requirements.txt`](requirements.txt) | Python 依赖 |
| [`src/`](src/) | 服务端源码（棋规、AI、Council、房间、API） |
| [`frontend/`](frontend/) | Web 客户端（对弈 / 学习 / 联机 / 工具） |

源码目录：

```
src/
├── main.py           # FastAPI 入口，挂载静态前端
├── rules.py          # 棋规、FEN、XiangqiGame
├── ai.py             # 内置 minimax
├── council.py        # 启发式理事会
├── puzzles.py        # 残局题库
├── rooms.py          # 联机房间
└── api/
    ├── routes.py     # 对弈 / 分析 / 题库 / FEN
    └── online.py     # 房间 REST + WebSocket
frontend/
├── index.html        # 对弈 + Council
├── learn.html
├── online.html
├── tools.html
├── app.js
└── style.css
```

---

## 编译与运行

### 环境要求

- Python ≥ 3.10
- 仅需 `requirements.txt` 中的依赖即可运行当前 MVP  
  （**不需要**预先安装 Pikafish，也 **不需要** LLM API Key）

### 本地启动

```bash
git clone https://github.com/qstk423/Xiang-qi-gaming.git
cd Xiang-qi-gaming
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m src.main
```

浏览器打开：[http://127.0.0.1:8200](http://127.0.0.1:8200)

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址；局域网演示可保持默认 |
| `PORT` | `8200` | 默认端口（与 ChessCouncil 常用的 8000 错开） |
| `RELOAD` | `0` | 设为 `1` 开启热重载 |

同网其它设备访问：`http://<本机局域网IP>:8200`。

### 已知边界

- 默认进程内共享「单盘分析对局」；联机房间为独立状态。
- 尚无多租户、账号与棋谱持久化。
- 刷新对弈页会按前端逻辑开新局或按 URL 参数恢复；联机需先在联机页入座。

---

## 主要 API

客户端应只依赖下列契约（字段设计贴近 ChessCouncil，便于双棋种共用）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查（含 `engine` / `council` / `rules`） |
| `GET` | `/api/capabilities` | `ready` / `planned` 能力清单 |
| `POST` | `/api/game/new` | 新对局 |
| `GET` | `/api/game/state` | 当前局面 |
| `POST` | `/api/game/move` | 走子（UCI，如 `h2e2`） |
| `POST` | `/api/game/undo` | 悔棋 |
| `POST` | `/api/game/ai-step` | AI 一步 |
| `POST` | `/api/game/targets` | 某格合法目标 |
| `POST` | `/api/game/load-fen` | 加载 FEN |
| `POST` | `/api/game/analyze-position` | 只分析不走子，返回 `council` |
| `GET` | `/api/puzzles` | 题库列表 |
| `POST` | `/api/puzzles/{id}/load` | 加载题目 |
| `POST` | `/api/rooms` · `.../join` | 创建 / 加入房间 |
| `GET` | `/api/rooms/{id}` | 房间局面 |
| `WS` | `/api/rooms/{id}/ws?token=` | 实时同步 |

`analyze-position` 返回的 `council` 包含：`eval`、`agents`（tactical / strategic / risk / coach）、`disagreement`、`debate`、`verdict`。

---

## 与相关项目的关系

| 项目 | 关系 |
|------|------|
| [ChessCouncil](https://github.com/qstk423/chessmind) | 产品姐妹项目。国际象棋侧已具备 Stockfish + LLM Council；本仓库是可合并的中国象棋侧。 |
| [Pikafish](https://github.com/official-pikafish/Pikafish) | 目标 UCI 引擎。Pikafish 本身 **不含 GUI**，需由外部界面调用；本项目未来应作为其 GUI / 业务壳之一接入，并遵守 GPLv3。 |
| [ElephantChess](https://github.com/benckx/elephantchess) | 功能对标清单，非代码来源。 |

**进度（产品视角）**

- [x] 可交互棋盘、着法记录、翻转、悔棋
- [x] 完整棋规 MVP（将军 / 应将 / 绝杀 / 困毙）
- [x] 人机对弈（内置 AI）
- [x] Council 面板（启发式分歧与辩论）
- [x] 残局 / 战术题
- [x] 房间联机（最小可用）
- [ ] 接入 Pikafish（UCI）与引擎分评估
- [ ] LLM 级 Council（对齐 ChessCouncil）
- [ ] 棋谱库与赛后复盘
- [ ] 大厅 / 观战 / 账号

---

## 路线图

**已完成**

- 服务端棋规作为真相来源，Web 四页客户端可用
- 内置 AI 与启发式 Council（契约按可替换设计）
- 残局题、FEN 工具、WebSocket 房间

**下一步**

1. 接入 [Pikafish](https://github.com/official-pikafish/Pikafish)，替换 / 增强选着与评估  
2. Council 接入 LLM，复用 ChessCouncil 的分歧 → 辩论 → 仲裁流水线  
3. 冻结 OpenAPI，作为第二客户端唯一对接面  
4. 棋谱持久化与赛后复盘  
5. 与 ChessCouncil 合并：统一壳 + `game_type=chess|xiangqi`

---

## 使用条款

本项目以 [MIT License](LICENSE) 发布。你可以自由使用、修改、分发本仓库中的原创代码，惟须保留版权与许可声明。

若日后在发行包中 **嵌入或紧密耦合** [Pikafish](https://github.com/official-pikafish/Pikafish)（GPLv3）等第三方引擎，发行方式必须同时满足对方许可证要求（例如提供对应源码或源码获取方式）。在完成接入与合规方案前，本仓库默认发行物 **不包含** Pikafish 二进制。

---

## 致谢

- [ChessCouncil](https://github.com/qstk423/chessmind) — 产品形态与 Council 交互参考  
- [Pikafish](https://github.com/official-pikafish/Pikafish) — 中国象棋 UCI 引擎方向参考（衍生自 Stockfish 思路的象棋引擎）  
- [ElephantChess](https://github.com/benckx/elephantchess) — 功能范围对照  

---

## 许可证

[MIT](LICENSE)
