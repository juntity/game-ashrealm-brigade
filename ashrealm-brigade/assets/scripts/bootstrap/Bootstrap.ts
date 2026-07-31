import {
  _decorator,
  Button,
  Color,
  Component,
  Graphics,
  Label,
  Layers,
  Node,
  UITransform,
  Vec3,
} from 'cc';
import { BattleScreen } from '../screens/BattleScreen';
import { EquipmentManagementScreen, EquipmentPageMode } from '../screens/EquipmentManagementScreen';
import { BattleProgress } from '../modules/battle/BattleModel';
import { OfflineReward, OfflineRewardCalculator } from '../modules/offline/OfflineRewardCalculator';
import { EconomyCalculator } from '../modules/economy/EconomyCalculator';
import { HeroRoster } from '../modules/hero/HeroRoster';
import { GAME_BALANCE } from '../config/GameBalanceConfig';
import { CocosPlatformAdapter } from '../platform/CocosPlatformAdapter';
import { SaveData } from '../save/SaveData';
import { SaveDiagnostics, SaveService, SaveSlotDiagnostic } from '../save/SaveService';
import { ScreenAdapter } from '../ui/ScreenAdapter';
import { EQUIPMENT_CONFIG } from '../config/EquipmentConfig';
import { StageEquipmentDropper } from '../modules/equip/StageEquipmentDropper';
import { TaskScreen } from '../screens/TaskScreen';
import { TaskTracker } from '../modules/task/TaskTracker';

type GamePage = 'battle' | EquipmentPageMode | 'tasks';

const { ccclass } = _decorator;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
  private battleScreen: BattleScreen | null = null;
  private equipmentScreen: EquipmentManagementScreen | null = null;
  private taskScreen: TaskScreen | null = null;
  private navigationNode: Node | null = null;
  private readonly platform = new CocosPlatformAdapter();
  private readonly saveService = new SaveService(this.platform.storage, () => this.platform.now());
  private readonly offlineRewardCalculator = new OfflineRewardCalculator();
  private readonly economyCalculator = new EconomyCalculator();
  private readonly screenAdapter = new ScreenAdapter();
  private readonly stageEquipmentDropper = new StageEquipmentDropper();
  private contentRoot: Node | null = null;
  private saveData: SaveData | null = null;
  private offlineReward: OfflineReward = {
    elapsedSeconds: 0,
    rewardedSeconds: 0,
    gold: 0,
  };
  private removeHideListener: (() => void) | null = null;
  private removeShowListener: (() => void) | null = null;
  private developerMessage = '';
  private clearConfirmationPending = false;
  private battlePausedByLifecycle = false;
  private battlePausedByNavigation = false;
  private gameStarted = false;

  protected start(): void {
    this.screenAdapter.configureView();
    this.saveData = this.saveService.load();
    this.offlineReward = this.applyOfflineReward();
    this.removeHideListener = this.platform.onHide(() => this.onAppHide());
    this.removeShowListener = this.platform.onShow(() => this.onAppShow());
    this.buildLaunchScreen();
  }

  private buildLaunchScreen(): void {
    this.node.removeAllChildren();

    this.createBackground();
    this.contentRoot = this.screenAdapter.createSafeContent(this.node, 'LaunchSafeContent');
    this.createLabel('烬境旅团', 64, new Color(242, 207, 128, 255), new Vec3(0, 260, 0));
    this.createLabel('ASHREALM BRIGADE', 22, new Color(165, 174, 190, 255), new Vec3(0, 198, 0));
    this.createLabel('集结英雄，穿越烬境', 28, new Color(220, 223, 229, 255), new Vec3(0, 95, 0));
    if (this.offlineReward.gold > 0) {
      this.createLabel(
        `${this.formatOfflineDuration(this.offlineReward.rewardedSeconds)} · 离线收益 +${
          this.offlineReward.gold
        } 金币`,
        24,
        new Color(142, 201, 148, 255),
        new Vec3(0, 20, 0),
      );
    }
    this.createStartButton();
    this.createDeveloperButton('InspectSaveButton', '检查存档', -145, this.onInspectSave);
    this.createDeveloperButton(
      'ClearSaveButton',
      this.clearConfirmationPending ? '确认清档' : '清除存档',
      145,
      this.onClearSave,
    );
    if (this.developerMessage.length > 0) {
      this.createLabel(
        this.developerMessage,
        18,
        new Color(165, 174, 190, 255),
        new Vec3(0, -390, 0),
      );
    }
    this.createLabel('开发版本 0.1.0', 20, new Color(122, 130, 145, 255), new Vec3(0, -570, 0));
  }

  private createBackground(): void {
    const visibleSize = this.screenAdapter.getVisibleSize();
    const background = this.createUiNode('Background', visibleSize.width, visibleSize.height);
    const graphics = background.addComponent(Graphics);

    graphics.fillColor = new Color(18, 22, 31, 255);
    graphics.rect(
      -visibleSize.width / 2,
      -visibleSize.height / 2,
      visibleSize.width,
      visibleSize.height,
    );
    graphics.fill();

    graphics.fillColor = new Color(35, 43, 58, 255);
    graphics.circle(0, 140, 280);
    graphics.fill();

    graphics.fillColor = new Color(21, 26, 36, 255);
    graphics.circle(0, 140, 210);
    graphics.fill();

    this.node.addChild(background);
  }

  private createStartButton(): void {
    const buttonNode = this.createUiNode('StartButton', 360, 104);
    buttonNode.setPosition(0, -120, 0);

    const graphics = buttonNode.addComponent(Graphics);
    graphics.fillColor = new Color(183, 132, 54, 255);
    graphics.roundRect(-180, -52, 360, 104, 18);
    graphics.fill();

    const button = buttonNode.addComponent(Button);
    button.transition = Button.Transition.NONE;
    buttonNode.on(Button.EventType.CLICK, this.onStartGame, this);

    const labelNode = this.createUiNode('Label', 320, 80);
    const label = labelNode.addComponent(Label);
    label.string = '开始远征';
    label.fontSize = 34;
    label.lineHeight = 44;
    label.color = new Color(24, 27, 34, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    buttonNode.addChild(labelNode);
    this.requireContentRoot().addChild(buttonNode);
  }

  private createDeveloperButton(name: string, text: string, x: number, callback: () => void): void {
    const buttonNode = this.createUiNode(name, 250, 80);
    buttonNode.setPosition(x, -275, 0);

    const graphics = buttonNode.addComponent(Graphics);
    graphics.fillColor = new Color(50, 58, 72, 255);
    graphics.roundRect(-125, -40, 250, 80, 12);
    graphics.fill();

    const button = buttonNode.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.96;
    buttonNode.on(Button.EventType.CLICK, callback, this);

    const labelNode = this.createUiNode(`${name}Label`, 230, 60);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 24;
    label.lineHeight = 32;
    label.color = new Color(220, 223, 229, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    buttonNode.addChild(labelNode);
    this.requireContentRoot().addChild(buttonNode);
  }

  private createLabel(text: string, fontSize: number, color: Color, position: Vec3): void {
    const labelNode = this.createUiNode(text, 680, 90);
    labelNode.setPosition(position);

    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 10;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    this.requireContentRoot().addChild(labelNode);
  }

  private createUiNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
  }

  private requireContentRoot(): Node {
    if (this.contentRoot === null) {
      throw new Error('Safe content root has not been created.');
    }
    return this.contentRoot;
  }

  private onStartGame(): void {
    this.showGamePage('battle');
  }

  private showGamePage(page: GamePage): void {
    const saveData = this.requireSaveData();
    this.equipmentScreen?.destroy();
    this.equipmentScreen = null;
    this.taskScreen?.destroy();
    this.taskScreen = null;
    this.navigationNode?.destroy();
    this.navigationNode = null;
    if (!this.gameStarted) {
      this.node.removeAllChildren();
      this.contentRoot = null;
      this.gameStarted = true;
    }
    if (this.battleScreen === null) {
      this.battleScreen = new BattleScreen(
        this.node,
        {
          stage: saveData.progress.stage,
          highestStage: saveData.progress.highestStage,
          gold: saveData.player.gold,
          heroLevel: saveData.heroes[0]?.level ?? 1,
          heroes: saveData.heroes,
          equippedSkillIds: saveData.skills.equippedSkillIds,
        },
        (progress) => this.saveProgress(progress),
      );
    }
    if (page === 'battle') {
      this.battleScreen.node.active = true;
      if (this.battlePausedByNavigation) {
        this.battleScreen.resume();
        this.battlePausedByNavigation = false;
      }
    } else if (page === 'equipment' || page === 'bag') {
      this.battlePausedByNavigation ||= this.battleScreen.pause();
      this.battleScreen.node.active = false;
      this.equipmentScreen = new EquipmentManagementScreen(this.node, page, saveData, (next) =>
        this.saveManagementData(next),
      );
    } else {
      this.battlePausedByNavigation ||= this.battleScreen.pause();
      this.battleScreen.node.active = false;
      this.taskScreen = new TaskScreen(
        this.node,
        saveData,
        () => this.platform.now(),
        (next) => this.saveManagementData(next),
      );
    }
    this.buildNavigation(page);
  }

  private onInspectSave(): void {
    this.clearConfirmationPending = false;
    const saveData = this.requireSaveData();
    const diagnostics = this.saveService.inspect();
    const heroLevel = saveData.heroes[0]?.level ?? 1;
    this.developerMessage =
      `V${saveData.schemaVersion} R${saveData.revision} · 关卡 ${saveData.progress.stage}` +
      ` · 英雄 Lv.${heroLevel} · 金币 ${saveData.player.gold}\n${this.formatDiagnostics(
        diagnostics,
      )}`;
    this.buildLaunchScreen();
  }

  private onClearSave(): void {
    if (!this.clearConfirmationPending) {
      this.clearConfirmationPending = true;
      this.developerMessage = '再次点击“确认清档”将删除本机全部进度';
      this.buildLaunchScreen();
      return;
    }

    this.saveData = this.saveService.clearAll();
    this.offlineReward = {
      elapsedSeconds: 0,
      rewardedSeconds: 0,
      gold: 0,
    };
    this.clearConfirmationPending = false;
    this.developerMessage = '存档已清除，当前进度已恢复为初始状态';
    this.buildLaunchScreen();
  }

  protected update(deltaTime: number): void {
    this.battleScreen?.update(deltaTime);
  }

  protected onDestroy(): void {
    const buttonNode = this.node.getChildByName('StartButton');
    buttonNode?.off(Button.EventType.CLICK, this.onStartGame, this);
    this.battleScreen?.destroy();
    this.battleScreen = null;
    this.equipmentScreen?.destroy();
    this.equipmentScreen = null;
    this.taskScreen?.destroy();
    this.taskScreen = null;
    this.navigationNode?.destroy();
    this.navigationNode = null;
    this.removeHideListener?.();
    this.removeShowListener?.();
    this.removeHideListener = null;
    this.removeShowListener = null;
  }

  private saveProgress(progress: BattleProgress): void {
    const current = this.requireSaveData();
    const dropResult = this.stageEquipmentDropper.collect(
      current.equipment,
      current.progress.stage,
      progress.stage,
      current.equipmentDropPity,
    );
    const latestDrop = dropResult.drops[dropResult.drops.length - 1];
    const latestDropName =
      latestDrop === undefined
        ? null
        : (EQUIPMENT_CONFIG.templates.find((template) => template.id === latestDrop.templateId)
            ?.name ?? '未知装备');
    const taskTracker = new TaskTracker(current.tasks, this.platform.now());
    const clearedStages = Math.max(0, progress.stage - current.progress.stage);
    const heroUpgrades = progress.heroes.reduce((total, hero) => {
      const previousLevel =
        current.heroes.find((entry) => entry.heroId === hero.heroId)?.level ?? 1;
      return total + Math.max(0, hero.level - previousLevel);
    }, 0);
    taskTracker.record('monster-kill', clearedStages);
    taskTracker.record('stage-clear', clearedStages);
    taskTracker.record('hero-upgrade', heroUpgrades);
    this.saveData = this.saveService.save({
      ...current,
      player: {
        ...current.player,
        gold: progress.gold,
      },
      progress: {
        ...current.progress,
        stage: progress.stage,
        highestStage: progress.highestStage,
      },
      heroes: [...progress.heroes],
      skills: {
        equippedSkillIds: [...progress.equippedSkillIds],
      },
      equipment: dropResult.equipment,
      tasks: taskTracker.toSave(),
      equipmentDropPity: dropResult.pity,
    });
    if (latestDropName !== null) {
      this.battleScreen?.showEquipmentDrop(latestDropName);
    }
  }

  private saveManagementData(next: SaveData): SaveData {
    const current = this.requireSaveData();
    const taskTracker = new TaskTracker(next.tasks, this.platform.now());
    const previousEnhanceTotal = current.equipment.inventory.reduce(
      (total, item) => total + item.enhanceLevel,
      0,
    );
    const nextEnhanceTotal = next.equipment.inventory.reduce(
      (total, item) => total + item.enhanceLevel,
      0,
    );
    const equippedChanges = Object.entries(next.equipment.equippedBySlot).filter(
      ([slot, instanceId]) =>
        current.equipment.equippedBySlot[slot as keyof typeof current.equipment.equippedBySlot] !==
        instanceId,
    ).length;
    taskTracker.record('equipment-enhance', nextEnhanceTotal - previousEnhanceTotal);
    taskTracker.record('equipment-equip', equippedChanges);
    this.saveData = this.saveService.save({ ...next, tasks: taskTracker.toSave() });
    this.battleScreen?.synchronizeGold(this.saveData.player.gold);
    return this.saveData;
  }

  private buildNavigation(activePage: GamePage): void {
    const navigation = this.createUiNode('GameNavigation', 750, 92);
    navigation.setPosition(0, -620, 0);
    const background = navigation.addComponent(Graphics);
    background.fillColor = new Color(29, 35, 47, 250);
    background.rect(-375, -46, 750, 92);
    background.fill();
    const pages: ReadonlyArray<{
      id: GamePage;
      label: string;
      x: number;
    }> = [
      { id: 'battle', label: '战斗', x: -275 },
      { id: 'equipment', label: '装备', x: -92 },
      { id: 'bag', label: '背包', x: 92 },
      { id: 'tasks', label: '任务', x: 275 },
    ];
    for (const page of pages) {
      const buttonNode = this.createUiNode(`Nav_${page.id}`, 170, 70);
      buttonNode.setPosition(page.x, 0);
      const graphics = buttonNode.addComponent(Graphics);
      graphics.fillColor =
        page.id === activePage ? new Color(184, 133, 54, 255) : new Color(50, 58, 72, 255);
      graphics.roundRect(-82, -30, 164, 60, 10);
      graphics.fill();
      buttonNode.addComponent(Button).transition = Button.Transition.SCALE;
      buttonNode.on(Button.EventType.CLICK, () => this.showGamePage(page.id), this);
      const labelNode = this.createUiNode(`NavLabel_${page.id}`, 155, 55);
      const label = labelNode.addComponent(Label);
      label.string = page.label;
      label.fontSize = 24;
      label.lineHeight = 30;
      label.color = new Color(232, 232, 226, 255);
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;
      buttonNode.addChild(labelNode);
      navigation.addChild(buttonNode);
    }
    this.node.addChild(navigation);
    this.navigationNode = navigation;
  }

  private requireSaveData(): SaveData {
    if (this.saveData === null) {
      throw new Error('SaveData has not been loaded.');
    }
    return this.saveData;
  }

  private onAppHide(): void {
    if (this.saveData === null) {
      return;
    }
    this.battlePausedByLifecycle = this.battleScreen?.pause() ?? false;
    this.saveData = this.saveService.save(this.saveData);
  }

  private onAppShow(): void {
    const reward = this.applyOfflineReward();
    this.offlineReward = reward;
    if (this.battleScreen !== null) {
      this.battleScreen.showOfflineReward(reward);
      if (this.battlePausedByLifecycle) {
        this.battleScreen.resume();
      }
      this.battlePausedByLifecycle = false;
      return;
    }
    this.buildLaunchScreen();
  }

  private applyOfflineReward(): OfflineReward {
    const current = this.requireSaveData();
    const heroRoster = new HeroRoster(current.heroes);
    const passiveBonuses = heroRoster.getPassiveBonuses();
    const reward = this.offlineRewardCalculator.calculate({
      lastActiveAt: current.lastActiveAt,
      now: this.platform.now(),
      goldPerMinute: this.economyCalculator.getOfflineGoldPerMinute(
        current.progress.stage,
        heroRoster.getTotalDps(),
        passiveBonuses.goldMultiplier,
        passiveBonuses.offlineMultiplier,
      ),
      minimumOfflineSeconds: GAME_BALANCE.economy.offlineMinimumMinutes * 60,
      maxOfflineSeconds: GAME_BALANCE.economy.offlineMaxHours * 60 * 60,
    });

    if (reward.gold === 0) {
      return reward;
    }

    this.saveData = this.saveService.save({
      ...current,
      player: {
        ...current.player,
        gold: current.player.gold + reward.gold,
      },
    });
    return reward;
  }

  private formatOfflineDuration(seconds: number): string {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `离线 ${hours} 小时 ${minutes} 分钟` : `离线 ${minutes} 分钟`;
  }

  private formatDiagnostics(diagnostics: SaveDiagnostics): string {
    return [
      `主档${this.formatSlot(diagnostics.main)}`,
      `临时${this.formatSlot(diagnostics.temporary)}`,
      `备份${this.formatSlot(diagnostics.backup)}`,
      `损坏快照${diagnostics.hasCorruptSnapshot ? '有' : '无'}`,
    ].join(' · ');
  }

  private formatSlot(slot: SaveSlotDiagnostic): string {
    if (!slot.present) {
      return '空';
    }
    return slot.valid ? '有效' : '损坏';
  }
}
