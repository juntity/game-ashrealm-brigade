# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本代码仓库中工作时提供指导。

## 项目概述

**Ashrealm Brigade（烬境旅团）** 是一款基于 Cocos Creator 3.8.8 + TypeScript 构建的微信放置类RPG小游戏。代码库位于 `ashrealm-brigade/`。

项目严格区分纯游戏逻辑（可用 Vitest 测试）和 Cocos Creator 相关的表现层代码。业务逻辑不得导入 `cc` 或依赖场景节点。

## 常用命令

```bash
cd ashrealm-brigade

# 运行测试
npm test                  # 运行所有测试一次
npm run test:watch        # 监听模式

# 格式检查
npm run lint              # ESLint 检查
npm run format            # 使用 Prettier 自动格式化
npm run format:check      # 仅检查格式，不写入

# 类型检查（仅纯逻辑，排除 Cocos 引擎类型）
npm run typecheck
```

## 架构

### 目录结构

```
ashrealm-brigade/
  assets/scripts/
    bootstrap/            # 启动场景入口点（Cocos 组件）
    modules/               # 纯领域逻辑（战斗、英雄、装备、任务、经济、技能）
      battle/              # DamageCalculator, BattleModel
      hero/                # HeroCalculator, HeroRoster
      equip/               # EquipmentInventory, EquipmentGenerator, StageEquipmentDropper
      bag/                 # EquipmentBag
      skill/               # ActiveSkillBar, PassiveSkillAggregator
      economy/             # EconomyCalculator
      task/                # TaskTracker
      offline/             # OfflineRewardCalculator
    config/                # 类型安全的配置表（带验证器）
    save/                  # SaveData schema、SaveService、SaveMigrator
    platform/              # PlatformAdapter 接口 + CocosPlatformAdapter
    ui/                    # ScreenAdapter、UI 控制器（Cocos 组件）
    screens/               # BattleScreen、EquipmentManagementScreen、TaskScreen、HeroScreen
  tests/                  # 与 modules/ 一一对应 — Vitest 单元测试
```

### 模块设计规则

- **纯逻辑模块**（`modules/`、`platform/`、`save/`）禁止导入 `cc`（Cocos Creator）。这些模块可通过 `tsconfig.logic.json` 使用 Vitest 测试。
- **注入点**：随机（`Math.random` 包装器）、时间（`now()`）、存储（`StorageAdapter`）和广告（`AdAdapter`）必须通过注入获取，不得直接调用。
- **禁止跨模块状态共享**：模块间通过接口、命令或领域事件通信——禁止一个 UI 组件直接修改另一个组件的数据。
- **平台抽象**：所有 `wx.*` 微信 API 调用必须通过 `PlatformAdapter`。业务代码不得直接调用 `wx.*`。

### 核心模块

| 模块 | 职责 |
|---|---|
| `BattleModel` | 战斗计时、自动攻击、Boss计时器、关卡进度。暴露 `BattleSnapshot` 供 UI 使用。 |
| `HeroRoster` | 8英雄阵容（1主力 + 7可解锁）。团队DPS聚合。 |
| `EquipmentInventory` | 穿戴/卸下装备、按槽位统计属性、比较升级方案。 |
| `EquipmentBag` | 筛选、排序、保护标志、批量销毁预览。 |
| `EquipmentWorkshop` | 强化（必定成功）、升星（消耗精华）、出售、分解。 |
| `ActiveSkillBar` | 最多4个技能槽位、冷却时间追踪（暂停/后台时停止）。 |
| `PassiveSkillAggregator` | 在运行时从英雄解锁/等级推导被动技能（不持久化）。 |
| `TaskTracker` | 每日+成就进度、幂等奖励领取、每日重置。 |
| `SaveService` | Schema 版本管理、迁移（V1→V2→V3→...）、带损坏诊断的备份/恢复。 |

### 存档 Schema

当前版本为 **V7**。Schema 位于 `assets/scripts/save/SaveData.ts`。迁移路径：`SaveMigrator` 按顺序处理升级（绝不跳过版本）。加载失败时的恢复顺序：主存档 → 临时存档 → 备份 → 默认存档。

### 战斗状态机

`Loading → Fighting → MonsterDead → Spawning`（普通）或 `BossIntro → Fighting → Victory | Failed → Settlement`（Boss）。状态转换集中在中心——动画回调不得驱动业务逻辑结果。

### 装备进阶

- 7槽位 × 6稀有度 × 8词缀类型
- 攻击速度：间隔 = `baseInterval / (1 + speedBonus)`，上限200%加成（最小 = base/3）
- `EquipmentCombatCalculator` 聚合已装备属性 → 战斗DPS；装备变更同步到 `BattleModel` 而无需重建敌人

## 开发流程

1. **任务模板**必须包含：需求文档引用、允许/禁止的变更、输入契约、验收标准、验证命令。
2. **优先级**：已批准的规格文档 → 接口/Schema → 测试 → 实现。
3. **纯逻辑优先**：在 `modules/` 中实现和测试，不依赖任何 Cocos 相关代码，然后再接入screens。
4. **配置变更**：添加类型、默认值、验证器和迁移逻辑。
5. **幂等奖励**：任何奖励结算必须处理重复调用而不产生重复收益。
6. **AI交付检查清单**：实现符合已批准规格、无范围蔓延、错误/取消路径可恢复、事件监听器已清理、存档向后兼容、测试覆盖验收标准、Creator生命周期正确。

## 平台注意事项

- 微信小游戏是主要目标（MVP）；Web构建版本用于日常调试。
- `ResolutionPolicy.FIXED_WIDTH`，设计分辨率 750×1334；安全区域由 `ScreenAdapter` 处理。
- 应用生命周期：`onHide` → 立即暂停+保存；`onShow` → 计算离线奖励→恢复。
