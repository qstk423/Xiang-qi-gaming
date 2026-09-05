# Xiangqi Council

**多智能体辩论式中国象棋分析与对战系统。**

攻杀 / 局势 / 风险三位分析师并行给意见；分歧够大时展开辩论与仲裁；教练给出本步要点。对弈、学习、联机、工具共用同一套 FastAPI 后端。产品信息架构与交互形态对齐 [ChessCouncil](https://github.com/qstk423/chessmind)，目标是最终合并为双棋种产品（`game_type=chess|xiangqi`）。

> GitHub 仓库：[qstk423/Xiang-qi-gaming](https://github.com/qstk423/Xiang-qi-gaming)。产品名以 **Xiangqi Council** 为准。

---

## 为什么这样设计

中国象棋「能走」不难，难的是 **规则严谨、局势说得清、分析师之间还能吵出分歧**。Xiangqi Council 与 ChessCouncil 共用同一产品哲学：

| 层 | 职责 | 当前实现 |
|----|------|----------|
| **Brain（服务端）** | 棋规、选着、Council、房间、题库 | Python · FastAPI |
| **Client（客户端）** | 棋盘交互、分析呈现、四页导航 | PC 优先 Web |

原则：

1. **API 优先** — 能力经 HTTP / WebSocket 暴露；网页只是第一个客户端。
2. **规则与分析在服务端** — 前端不私藏「半套棋规」；合法着法、将军、胜负由后端裁定。
3. **与 ChessCouncil 同构** — 对弈 / 学习 / 联机 / 工具四入口；Council 侧有评估条、三师卡片、标签页、辩论与推荐走出。
4. **可降级、可替换** — 今天用内置 minimax + 规则启发式 Council；明天可换成 Pikafish / LLM，而不推翻前端契约。
5. **不整仓搬开源站** — [ElephantChess](https://github.com/benckx/elephantchess) 只作功能参考，不复制其代码与许可证负担。

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
     Web 客户端（未来可接原生壳）
```

---

## 现在能做什么

**对弈**

- 人人练习 / 人机对弈（执红或执黑）
- Canvas 棋盘：点选走子、合法目标高亮、上一步高亮、翻转、悔棋
- AI 一步、提示（走理事会推荐）、终局结果条（绝杀 / 困毙）

**象棋理事会（交互对齐 ChessCouncil）**

- 红黑评估条与局面标签（均势 / 略优 / 分歧局 / 应将 等）
- 三位分析师推荐着法（可点卡片切 Tab；再点可走出该推荐）
- 教练 / 攻杀 / 局势 / 风险 / 辩论五个标签页
- 「分析局面」「走后分析」「走出推荐」
- 争议度条；分歧足够时自动展开辩论文案与仲裁

> 说明：当前 Council 为 **规则启发式**（`heuristic_v1`），不是 LLM 辩论；引擎为 **内置 minimax**，尚未接入 Pikafish。结构已按可替换接口落地。

**学习**

- 残局 / 战术题列表（一步杀、重炮、捉子、应将、高兵等）
- 加载后跳转对弈页继续推演

**联机**

- 创建 / 加入六位房间码；WebSocket 实时同步（适合同网演示）
- 对弈页可恢复已加入房间

**工具**

- 当前局面 FEN 导出；粘贴 FEN 加载回对弈页

---

## 快速开始

### 环境

- Python ≥ 3.10
- 依赖见 `requirements.txt`（FastAPI + Uvicorn）；**无需**额外引擎或 LLM Key 即可完整体验当前 MVP

### 本地运行

```bash
git clone https://github.com/qstk423/Xiang-qi-gaming.git
cd Xiang-qi-gaming
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m src.main
```

浏览器打开 [http://127.0.0.1:8200](http://127.0.0.1:8200)。

可选环境变量：

| 变量 | 默认 | 说明 |
|------|------|------|
| `HOST` | `0.0.0.0` | 监听地址；局域网演示用默认即可 |
| `PORT` | `8200` | 与 ChessCouncil（常为 8000）错开，避免冲突 |
| `RELOAD` | `0` | 设为 `1` 开启热重载 |

手机 / 另一台电脑同网访问：`http://<本机局域网IP>:8200`。

已知边界：默认进程内共享「单盘分析对局」；联机房间是独立状态。尚无账号体系与持久化棋谱库。

---

## 仓库结构

```
src/
├── main.py           # FastAPI 入口 + 静态前端挂载
├── rules.py          # 棋规、FEN、将军/绝杀、XiangqiGame
├── ai.py             # 内置 minimax 选着
├── council.py        # 启发式三师 + 分歧/辩论/裁决
├── puzzles.py        # 残局题库
├── rooms.py          # 联机房间状态
└── api/
    ├── routes.py     # 对弈 / 分析 / 题库 / FEN
    └── online.py     # 房间 REST + WebSocket
frontend/
├── index.html        # 对弈 + Council
├── learn.html        # 学习
├── online.html       # 联机
├── tools.html        # 工具
├── app.js
└── style.css
```

---

## 主要 API（客户端契约）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查（含 `engine` / `council` / `rules` 版本字段） |
| `GET` | `/api/capabilities` | `ready` / `planned` 能力清单 |
| `POST` | `/api/game/new` | 新对局 |
| `GET` | `/api/game/state` | 当前局面 |
| `POST` | `/api/game/move` | 人类走子（UCI，如 `h2e2`） |
| `POST` | `/api/game/undo` | 悔棋 |
| `POST` | `/api/game/ai-step` | AI 一步 |
| `POST` | `/api/game/targets` | 某格合法目标 |
| `POST` | `/api/game/load-fen` | 加载 FEN |
| `POST` | `/api/game/analyze-position` | 只分析不走子；返回 `council` |
| `GET` | `/api/puzzles` | 题库列表 |
| `POST` | `/api/puzzles/{id}/load` | 加载题目到当前盘 |
| `POST` | `/api/rooms` · `.../join` | 创建 / 加入房间 |
| `GET` | `/api/rooms/{id}` | 房间局面 |
| `WS` | `/api/rooms/{id}/ws?token=` | 实时同步 |

`analyze-position` 响应中的 `council` 含 `eval`、`agents`（tactical / strategic / risk / coach）、`disagreement`、`debate`、`verdict`，字段形态刻意贴近 ChessCouncil，便于日后双棋种共用前端组件。

---

## 与 ChessCouncil / ElephantChess 的关系

| 项目 | 关系 |
|------|------|
| [ChessCouncil](https://github.com/qstk423/chessmind) | **产品姐妹**：同一套 IA（对弈/学习/联机/工具 + Council），国际象棋侧已有 Stockfish + LLM；本仓库是象棋侧可合并的第二棋种。 |
| [ElephantChess](https://github.com/benckx/elephantchess) | **功能对标清单**，非代码底座；不 fork、不搬站。 |

**对标进度（产品视角）**

- [x] 可交互棋盘、着法记录、翻转、悔棋
- [x] 完整棋规 MVP（含将军 / 应将 / 绝杀 / 困毙）
- [x] 人机对弈（内置 AI）
- [x] Council 面板（启发式分歧与辩论）
- [x] 残局 / 战术题
- [x] 房间联机（最小可用）
- [ ] Pikafish 深度分析与变化树
- [ ] LLM 级 Council（对齐 ChessCouncil 辩论质量）
- [ ] 棋谱库 / 赛后复盘持久化
- [ ] 大厅、观战、聊天、账号

---

## 路线图

**已落地**

- 服务端棋规真相来源 + Web 四页客户端
- 内置 AI 与启发式 Council（契约已按可替换设计）
- 残局题、FEN 工具、WebSocket 房间

**合理下一步**

1. **接入 Pikafish** — 替换 / 增强选着与评估，评估条改为引擎分  
2. **Council 接 LLM** — 复用 ChessCouncil 的分歧 → 辩论 → 仲裁流水线，换象棋 prompt  
3. **冻结 OpenAPI** — 把上表沉淀为双客户端唯一对接面  
4. **棋谱与复盘** — SQLite / 导入导出，赛后准确度类能力  
5. **与 ChessCouncil 合并** — 统一壳 + `game_type`，共享部署与账号（若需要）

---

## License

[MIT](LICENSE)。第三方引擎或模型接入时，单独保留其许可证与来源说明。
