# 技术设计文档（TDD）

> 版本：V0.3｜状态：草案｜技术栈：Cocos Creator 3.8.8 + TypeScript

## 1. 技术目标

项目采用数据驱动、模块解耦和可迁移存档。核心战斗必须可脱离表现层进行纯逻辑测试；配置表不得直接修改运行时状态；任何奖励结算必须具备幂等保护。

## 2. 建议目录

```text
ashrealm-brigade/         # Cocos Creator 工程根目录
  assets/                 # Creator 管理的源码与资源
    scenes/               # Boot、Main、Battle
    prefabs/              # 页面、弹窗、通用预制体
    scripts/              # TypeScript 源码
      core/               # 启动、事件、时间、日志、服务容器
      modules/            # Battle、Hero、Equip、Bag、Task、Skill...
      ui/                 # 页面控制器和通用组件
      config/             # 配置类型、加载与校验
      save/               # 存档模型、迁移、序列化
      platform/           # Web、微信平台适配器
    resources/
      config/             # 运行时 JSON 配置
      art/                # sprite、spine、effect、audio
  tests/                  # 与纯逻辑模块对应
  tools/                  # 配置校验、数值模拟和构建辅助脚本
```

Cocos Creator 日常开发主要维护 `assets/`、`settings/`、`extensions/`、`tests/` 和 `tools/`。不要手工修改 `library/`、`temp/`、`local/`、`profiles/` 或 `build/` 等生成目录；是否提交及忽略以工程生成后的 `.gitignore` 为准。启动场景使用 Boot，先完成配置与存档初始化，再进入主场景。

## 3. 分层与依赖

```text
UI/表现层 → 应用服务层 → 领域逻辑层
                       ↘ 配置只读层
基础设施层（存档、广告、音频、平台）实现领域接口
```

- `Battle`：战斗时钟、目标、伤害、死亡、关卡状态机。
- `Hero`：英雄解锁、等级、阵容和属性聚合。
- `Equip` / `Bag`：物品实例、穿戴、强化、分解和容量。
- `Skill`：装配、冷却、效果执行。
- `Task`：进度事件、刷新与幂等奖励。
- `Save`：快照、迁移、校验和恢复。
- `Ad`：平台广告适配，不允许业务直接调用微信 API。
- `Config`：加载、索引、引用校验，运行时只读。
- `Audio`：分组音量、生命周期和资源释放。
- `Platform`：封装 Storage、生命周期、广告、分享和设备信息；业务层禁止直接调用 `wx.*`。

模块之间通过接口、命令或领域事件通信。禁止从一个 UI 组件直接修改另一个模块的数据。

## 4. 核心状态机

战斗状态：`Loading → Fighting → MonsterDead → Spawning`；Boss 关使用 `BossIntro → Fighting → Victory | Failed → Settlement`。状态切换必须集中处理，避免动画回调决定业务结果。

应用生命周期：启动时按“配置加载 → 存档加载/迁移 → 服务初始化 → 场景进入”执行。Web 与微信生命周期统一由 `PlatformAdapter` 转换为领域事件。进入后台时记录时间并立即保存；返回前台时先计算时间差，再恢复显示。

## 5. 数值与时间

内部数值使用 `number`，但所有经济与伤害计算通过统一 `MathService` 完成。显示层负责 K/M/B 等缩写，不把格式化字符串写回模型。若数值预计超过安全整数范围，应在内容扩展前引入大数方案。

战斗逻辑使用固定步长或受控 `deltaTime`，技能冷却、Boss 计时和离线收益统一由 `TimeService` 提供。离线时间采用本地时间并做回拨检测；MVP 的防作弊目标是降低误结算，不承诺完全可信。

## 6. 配置表

每张表必须包含稳定字符串 ID、`schemaVersion` 和明确引用。开发初期采用类型安全的 TypeScript 配置，内容量扩大后可机械转换为 JSON。英雄首表位于 `assets/scripts/config/HeroConfig.ts`，由 `HeroConfigValidator` 在测试阶段校验。建议完整配置表：

`heroes.json`、`monsters.json`、`stages.json`、`skills.json`、`equipment-templates.json`、`affixes.json`、`economy.json`、`tasks.json`、`localization.json`。

构建前校验：ID 唯一、引用存在、枚举合法、数值范围合理、100 关连续、5 个 Boss 可到达。配置加载失败应阻止进入游戏并输出具体表名和字段路径。

装备首表位于 `assets/scripts/config/EquipmentConfig.ts`，包含 7 个部位、6 档品质、8 类词条和 7 个灰盒模板。`EquipmentConfigValidator` 校验部位唯一、品质档位、史诗以上自动保护、词条数上限、主属性约束及模板—词条引用兼容性。掉落权重集中在 `EquipmentDropConfig.ts`；`EquipmentGenerator` 使用可注入随机源生成物品实例与唯一词条，`EquipmentInventory` 负责穿戴、卸下、属性汇总和同部位比较。`EquipmentBag` 提供部位/品质筛选、品质/等级/综合属性稳定排序和手动保护；综合评分权重位于 `EquipmentBagConfig.ts`。`EquipmentWorkshop` 负责必定成功的强化、消耗装备精华的升星、出售、分解和一键穿戴，成长费用与收益集中在 `EquipmentProgressionConfig.ts`。批量销毁必须先预览并排除保护或穿戴中的装备。模板配置与物品实例保持分离。

## 7. 存档设计

```ts
interface SaveData {
  schemaVersion: number;
  revision: number;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
  player: PlayerSave;
  progress: ProgressSave;
  heroes: HeroSave[];
  inventory: InventorySave;
  skills: SkillSave;
  tasks: TaskSave;
  settings: SettingsSave;
  claims: Record<string, boolean>;
}
```

当前存档 Schema 为 V3：`progress.highestStage` 记录历史最高关卡，`heroes` 固定保存 8 位英雄的 `heroId`、`level`、`isUnlocked` 与 `isDeployed`，`skills.equippedSkillIds` 保存最多 4 个主动技能槽。旧存档按 V1 → V2 → V3 逐级迁移，保留主角等级、金币和关卡，并补齐英雄及技能数据。为兼容现有玩家，本地 Storage 键暂时沿用 `ashrealm.save.v1`，键名不得作为 Schema 版本判断依据。

保存采用“序列化 → 校验 → 写临时键 → 回读 → 替换主键”的流程，并保留最近一次有效备份。加载恢复顺序固定为“主存档 → 临时存档 → 备份 → 默认存档”；无效候选的原文保存在 `ashrealm.save.corrupt.latest`，供开发诊断。每次结构变化增加 `schemaVersion`，由 `SaveMigrator` 按版本逐级迁移，禁止跳过版本；迁移成功后立即以当前 Schema 回写。奖励领取 ID 与存档共同保存以保证幂等。

开发阶段在启动页提供“检查存档”和“清除存档”。检查功能只显示 Schema、修订号、核心进度及各存档槽状态，不输出完整存档；清档必须二次确认，并同时删除主存档、临时存档、备份与损坏快照。发布构建前应通过开发环境开关隐藏这组入口。

战斗暂停状态属于运行时状态，不写入存档。玩家主动暂停或应用进入后台后，自动攻击、点击攻击与 Boss 倒计时停止；返回前台时先结算离线收益，再恢复由生命周期触发的暂停。若玩家在切后台前已手动暂停，返回后保持暂停，避免生命周期事件覆盖玩家意图。

英雄编队由 `HeroRoster` 管理。主角永久解锁并上阵，支援位最多 3 个；解锁依据 `highestStage` 幂等同步。队伍 DPS 为所有已解锁且已上阵英雄的 `攻击 ÷ 攻击间隔` 之和，同时用于自动战斗和离线收益估算。

主动技能由 `ActiveSkillBar` 管理，最多 4 槽。首轮技能为烬火斩、陨星术、箭雨和圣光裁决，按最高关卡解锁；伤害取 `队伍 DPS × 技能倍率`。冷却仅在有效战斗时间推进，暂停、后台和 Boss 失败期间停止，且冷却期间不得重复释放。冷却属于运行时战斗状态，不写入存档。

被动技能由 `PassiveSkillAggregator` 根据英雄解锁与等级实时推导，不写入存档。被动永久生效且不要求英雄上阵；攻击和暴击聚合到队伍期望 DPS，金币倍率同时影响在线击杀和离线估算，离线倍率只作用于离线收益。组件不得自行叠加被动数值。

屏幕适配由 `ScreenAdapter` 统一管理。项目使用 750 × 1334 竖屏设计分辨率和 `ResolutionPolicy.FIXED_WIDTH`；全屏背景按实时可见尺寸绘制，交互内容挂载在 Cocos `SafeArea` 容器中。业务页面不得自行设置分辨率策略或直接调用平台安全区 API。

## 8. 性能预算

- 目标：中端微信小游戏设备战斗稳定 50～60 FPS，低端不低于 30 FPS。
- 同屏战斗对象按 MVP 固定数量设计，伤害数字、特效和掉落必须对象池化。
- 首包、分包和纹理预算在首轮真机验证后锁定；单张纹理优先图集化。
- 页面退出时解除事件监听、停止定时器并释放不再使用的动态资源。

## 9. 测试策略

纯逻辑单元测试覆盖伤害、暴击、升级费用、掉落、任务进度、离线结算和迁移。集成测试覆盖“战斗胜利—奖励—保存—重启恢复”。真机测试覆盖冷启动、弱网广告、前后台切换、低内存和日期跨天。

## 10. 构建与发布

日常开发先使用 Cocos Creator 的浏览器预览；发布时在构建面板选择“微信小游戏”，生成 `build/` 下的微信构建目录，再通过微信开发者工具预览和真机测试。正式资源使用 Asset Bundle 按启动必需、小游戏分包和远程资源分类，禁止等到内容完成后再处理包体限制。

每个发布候选版本至少验证：首次启动、资源下载、前后台切换、本地存档、激励广告失败/成功、弱网与真机内存。IDE 预览通过不能替代微信真机验证。

## 11. 安全与发布

密钥不得写入源码或 JSON 配置。广告与支付结果只通过平台适配器返回，业务层处理失败、取消和重复回调。发布包必须关闭调试作弊入口，保留分级日志和错误版本信息。

## 12. 待评审

- `DECISION:` 编辑器及构建环境固定使用 Cocos Creator 3.8.8。
- `DECISION:` 最低兼容微信基础库为 2.12.0；新增微信 API 必须检查版本，并提供能力检测或降级路径。
- `TBD:` 测试框架、格式化工具及 CI 平台。
- `TBD:` 首包体积、纹理和音频硬预算。
- `TBD:` 是否需要大数库及启用阈值。
