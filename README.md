# Xiangqi Council

中国象棋多智能体分析与对战平台。PC 端优先，视觉和信息架构与
[ChessCouncil](https://github.com/qstk423/chessmind) 保持一致，最终可合并成双棋种产品。

当前是第一版基础框架：

- PC 双栏对弈页（棋盘 + Council + 着法记录）
- Canvas 象棋棋盘、基础合法走法、吃子、悔棋与翻转
- 对弈 / 学习 / 联机 / 工具四个稳定模块入口
- FastAPI 服务壳及 `/api/health`、`/api/capabilities`
- 不复制 ElephantChess 源码；借鉴其产品功能范围

> 当前棋规仅用于前端 MVP：已有单子走法、蹩马腿、塞象眼、炮架、过河兵、
> 九宫与将帅照面约束，但还没有完整的将军/应将、重复局面与胜负裁定。

## 架构原则

```text
统一产品壳
├── 对弈
├── 学习
├── 联机
└── 工具
       │
       ▼
稳定 API / WebSocket 契约
       │
       ├── XiangqiRules（完整棋规）
       ├── PikafishAdapter（引擎）
       ├── XiangqiCouncil（攻杀 / 局势 / 风险）
       ├── RoomService（房间与观战）
       └── Repository（棋局 / 题库 / 棋谱）
```

前端棋盘、规则、引擎和产品业务分层，避免把任何一个开源完整站点整仓搬入。
后续与 ChessCouncil 合并时，只需在统一壳上增加 `game_type=chess|xiangqi`。

## 本地运行

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.main
```

打开 <http://127.0.0.1:8200>。

也可以直接打开 `frontend/index.html` 体验纯前端棋盘。

## ElephantChess 功能对标

[ElephantChess](https://github.com/benckx/elephantchess) 是功能参考，不是代码底座。

- [x] 可交互棋盘、着法记录、翻转、悔棋（基础版）
- [ ] 完整棋规与测试
- [ ] Pikafish 人机 / 分析
- [ ] 分析棋盘、变化树、着法标注
- [ ] 残局 / 战术题与进度
- [ ] 棋谱数据库（棋手 / 赛事 / 开局）
- [ ] 好友房间与实时同步
- [ ] 大厅、观战、聊天
- [ ] 游客身份与可选账号
- [ ] Council 分歧辩论与教练讲解

## 推荐实施顺序

1. 完整棋规 + Pikafish + 人机闭环
2. Council + 分析棋盘 + 残局题
3. 房间联机 + 棋谱数据库
4. 大厅 / 观战 / 游客账号
5. 与 ChessCouncil 合并双棋种入口

## 许可证

MIT。第三方依赖接入时会单独保留其许可证和来源说明。
