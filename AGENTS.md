# 仓库指南

## 项目结构与模块组织

本仓库目前处于《烬境旅团》（英文工作名：Ashrealm Brigade）立项设计阶段。研发文档统一存放在 `docs/` 中，Cocos Creator 工程位于 `ashrealm-brigade/`。文档入口为 `docs/README.md`。GDD 定义游戏方向，PRD 定义功能与验收，TDD 定义实现架构，数值文档定义公式与参数；专项文档已批准的结论优先于概述性 GDD。修改系统规则时，应同步更新所有受影响文档。

开发进度统一维护在 `docs/development/TODO.md`。开始任务前确认依赖与优先级，完成后仅在 Creator/测试环境验证通过时勾选，并同步更新“当前下一步”。

客户端固定使用 Cocos Creator 3.8.8 与 TypeScript。工程目录和依赖遵循 `docs/technical/tdd.md`；`ashrealm-brigade/assets/` 管理场景、脚本与资源。按 `Battle`、`Hero`、`Equip`、`Bag`、`Task`、`Skill`、`Save`、`Ad`、`Config`、`Audio` 和 `Platform` 拆分模块，避免模块间直接共享可变状态。

## 构建、测试与开发命令

在 `ashrealm-brigade/` 中运行工程质量命令：

- `npm test`：运行 Vitest 纯逻辑单元测试。
- `npm run typecheck`：严格检查不依赖 Creator 的领域与存档代码。
- `npm run lint`：检查 TypeScript 代码规范。
- `npm run format:check`：验证 Prettier 格式。
- `npm run format`：格式化源码与测试。

工程必须使用 Cocos Creator 3.8.8 打开和构建，未经评审不得升级或使用其他版本保存场景及资源。微信基础库最低兼容 2.12.0；调用新增平台 API 时必须进行能力检测并提供降级路径。提交前还应从仓库根目录运行 `git diff --check`。`build/`、`library/`、`temp/` 等生成内容不得手工修改或提交，除非发布流程另有明确要求。

## 编码风格与命名约定

文件统一使用 UTF-8 编码、Unix 换行符，并在末尾保留换行。Markdown 文档应采用简洁标题、短段落，以及标明语言的围栏代码块。文档文件名使用小写短横线格式，例如 `combat-rules.md`。

TypeScript 使用 2 空格缩进。类、组件和类型采用 `PascalCase`，变量与函数采用 `camelCase`，常量采用 `UPPER_SNAKE_CASE`。模块名与 GDD 保持一致，例如 `BattleService`、`HeroConfig`。配置字段应稳定且含义明确。战斗、英雄成长和经济参数统一放在 `ashrealm-brigade/assets/scripts/config/GameBalanceConfig.ts`，公式放在对应模块的纯逻辑计算器中；组件只负责交互与展示，不得重复硬编码平衡数值。遵循项目已配置的格式化与检查工具，不要引入相互冲突的工具。

## 测试指南

纯逻辑测试使用 Vitest，文件命名为 `*.test.ts` 并放在 `ashrealm-brigade/tests/`。重点覆盖伤害结算、暴击、金币与升级曲线、装备词条、关卡推进、离线收益和存档迁移。涉及掉落或随机词条时注入固定随机源。玩法变更还应在 Creator 浏览器预览和微信真机中按 GDD 的 MVP 清单手动回归。

## 提交与拉取请求指南

当前没有可用于总结既有规范的 Git 历史。提交标题应简短并使用祈使语气，可按需添加作用域，例如：`battle: 实现自动攻击循环` 或 `docs: 更新装备规则`。

拉取请求应说明变更目的、概述主要修改、列出已执行的验证，并关联相关问题。UI、动画或玩法变更应附带微信小游戏环境的截图或录屏。涉及 JSON 配置、本地 Storage 格式、广告逻辑或 GDD 规则的变更必须明确标注，并说明兼容与迁移方案。
