# Xiangqi Council

中国象棋多智能体分析与对战平台。PC 端优先，视觉和信息架构与
[ChessCouncil](https://github.com/qstk423/chessmind) 对齐，后续可合并为双棋种产品。

仓库：https://github.com/qstk423/Xiang-qi-gaming

## 当前已实现（MVP）

- **完整棋规**：合法着法、蹩马腿 / 塞象眼 / 炮架、过河兵、九宫、将帅照面、将军 / 应将、绝杀 / 困毙
- **对弈**：人人练习、人机对弈（内置 minimax）、悔棋、翻转、合法着法高亮、提示
- **象棋理事会（同 ChessCouncil 交互）**：评估条、攻杀 / 局势 / 风险三师、教练 / 辩论标签页、争议度、分析局面 / 走后分析 / 走出推荐
- **学习**：残局 / 战术题库（可加载到对弈页）
- **联机**：房间创建 / 加入 + WebSocket 同步
- **工具**：FEN 导入 / 导出
- FastAPI 服务：`/api/health`、`/api/capabilities`、对弈 / 分析 / 残局 / 房间 API

> Council 当前为规则启发式（无 LLM）；引擎侧尚未接入 Pikafish。不复制 ElephantChess 源码，只参考功能范围。

## 架构

```text
统一产品壳
├── 对弈
├── 学习
├── 联机
└── 工具
       │
       ▼
稳定 API / WebSocket
       │
       ├── XiangqiRules（完整棋规）✅
       ├── BuiltinAI / Council（启发式）✅
       ├── RoomService（房间）✅
       ├── Puzzles（残局题）✅
       ├── PikafishAdapter（引擎）⏳
       └── LLM Debate / Repository ⏳
```

与 ChessCouncil 合并时，在统一壳上增加 `game_type=chess|xiangqi` 即可。

## 本地运行

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.main
```

打开 <http://127.0.0.1:8200>。

默认端口 `8200`（可用环境变量 `PORT` / `HOST` / `RELOAD=1` 调整）。

## ElephantChess 功能对标

[ElephantChess](https://github.com/benckx/elephantchess) 是功能参考，不是代码底座。

- [x] 可交互棋盘、着法记录、翻转、悔棋
- [x] 完整棋规（将军 / 应将 / 绝杀 MVP）
- [x] 人机对弈（内置 AI；Pikafish 待接入）
- [x] Council 分歧辩论与教练讲解（启发式版）
- [x] 残局 / 战术题
- [x] 好友房间与实时同步（最小可用）
- [ ] Pikafish 深度分析 / 变化树
- [ ] 棋谱数据库（棋手 / 赛事 / 开局）
- [ ] 大厅、观战、聊天
- [ ] 游客身份与可选账号
- [ ] LLM 级 Council 辩论

## 推荐下一步

1. 接入 Pikafish，替换 / 增强内置 AI 与局面评估
2. Council 接 LLM（对齐 ChessCouncil 辩论质量）
3. 棋谱库与赛后复盘
4. 与 ChessCouncil 合并双棋种入口

## 许可证

MIT。第三方依赖接入时会单独保留其许可证和来源说明。
