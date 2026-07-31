import { Button, Color, Graphics, Label, Layers, Node, UITransform } from 'cc';
import { BattleModel, BattleProgress, BattleSnapshot } from '../modules/battle/BattleModel';
import { OfflineReward } from '../modules/offline/OfflineRewardCalculator';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ScreenAdapter } from '../ui/ScreenAdapter';

export class BattleScreen {
  public readonly node = new Node('BattleScreen');

  private readonly model: BattleModel;
  private readonly screenAdapter = new ScreenAdapter();
  private readonly contentRoot: Node;
  private readonly onProgressChanged: (progress: BattleProgress) => void;
  private lastPersistedRevision = 0;
  private readonly stageLabel: Label;
  private readonly goldLabel: Label;
  private readonly offlineRewardLabel: Label;
  private readonly hpLabel: Label;
  private readonly heroLabel: Label;
  private readonly upgradeLabel: Label;
  private readonly pauseLabel: Label;
  private readonly formationLabel: Label;
  private readonly statusLabel: Label;
  private readonly hpBar: Graphics;
  private readonly monsterButton: Node;
  private readonly upgradeButton: Node;
  private readonly retryButton: Node;
  private readonly pauseButton: Node;
  private readonly formationButton: Node;
  private readonly skillButtons: Node[] = [];
  private readonly skillLabels: Label[] = [];
  private readonly skillHandlers: Array<() => void> = [];

  public constructor(
    parent: Node,
    initialProgress: BattleProgress,
    onProgressChanged: (progress: BattleProgress) => void,
  ) {
    this.model = new BattleModel(initialProgress);
    this.onProgressChanged = onProgressChanged;
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    parent.addChild(this.node);

    this.createBackground();
    this.contentRoot = this.screenAdapter.createSafeContent(this.node, 'BattleSafeContent');
    this.stageLabel = this.createLabel('StageLabel', 30, 0, 565);
    this.pauseButton = this.createSmallButton('PauseButton', 285, 570);
    this.pauseLabel = this.createLabelNode(this.pauseButton, '暂停', 22);
    this.goldLabel = this.createLabel('GoldLabel', 28, 0, 510);
    this.offlineRewardLabel = this.createLabel('OfflineRewardLabel', 20, 0, 458);
    this.offlineRewardLabel.color = new Color(142, 201, 148, 255);

    this.statusLabel = this.createLabel('EnemyTitle', 28, 0, 398);
    this.monsterButton = this.createMonster();
    this.hpBar = this.createHpBar();
    this.hpLabel = this.createLabel('HpLabel', 23, 0, 70);

    this.heroLabel = this.createLabel('HeroLabel', 27, 0, -245);
    this.formationButton = this.createWideSmallButton('FormationButton', 250, -310);
    this.formationLabel = this.createLabelNode(this.formationButton, '自动编队', 21);
    this.upgradeButton = this.createButton('UpgradeButton', 0, -400);
    this.upgradeLabel = this.createLabelNode(this.upgradeButton, '升级英雄', 29);
    this.createSkillButtons();
    this.retryButton = this.createButton('RetryButton', 0, -400);
    this.createLabelNode(this.retryButton, '重新挑战 Boss', 27);

    this.createLabel('TipLabel', 21, 0, -610).string = '点击魔物造成伤害 · 英雄每秒自动攻击';

    this.monsterButton.on(Button.EventType.CLICK, this.onMonsterClicked, this);
    this.upgradeButton.on(Button.EventType.CLICK, this.onUpgradeClicked, this);
    this.retryButton.on(Button.EventType.CLICK, this.onRetryClicked, this);
    this.pauseButton.on(Button.EventType.CLICK, this.onPauseClicked, this);
    this.formationButton.on(Button.EventType.CLICK, this.onFormationClicked, this);
    this.render(this.model.getSnapshot());
  }

  public update(deltaTime: number): void {
    this.model.tick(deltaTime);
    this.render(this.model.getSnapshot());
    this.persistIfChanged();
  }

  public destroy(): void {
    this.monsterButton.off(Button.EventType.CLICK, this.onMonsterClicked, this);
    this.upgradeButton.off(Button.EventType.CLICK, this.onUpgradeClicked, this);
    this.retryButton.off(Button.EventType.CLICK, this.onRetryClicked, this);
    this.pauseButton.off(Button.EventType.CLICK, this.onPauseClicked, this);
    this.formationButton.off(Button.EventType.CLICK, this.onFormationClicked, this);
    this.skillButtons.forEach((button, index) => {
      button.off(Button.EventType.CLICK, this.skillHandlers[index], this);
    });
    this.node.destroy();
  }

  public showOfflineReward(reward: OfflineReward): void {
    this.offlineRewardLabel.string = this.formatOfflineReward(reward);
    if (reward.gold > 0 && this.model.grantGold(reward.gold)) {
      this.render(this.model.getSnapshot());
      this.persistIfChanged();
    }
  }

  public pause(): boolean {
    const changed = this.model.pause();
    if (changed) {
      this.render(this.model.getSnapshot());
    }
    return changed;
  }

  public resume(): boolean {
    const changed = this.model.resume();
    if (changed) {
      this.render(this.model.getSnapshot());
    }
    return changed;
  }

  private createBackground(): void {
    const visibleSize = this.screenAdapter.getVisibleSize();
    const background = this.createNode('Background', visibleSize.width, visibleSize.height);
    const graphics = background.addComponent(Graphics);
    graphics.fillColor = new Color(17, 21, 30, 255);
    graphics.rect(
      -visibleSize.width / 2,
      -visibleSize.height / 2,
      visibleSize.width,
      visibleSize.height,
    );
    graphics.fill();
    this.node.addChild(background);
  }

  private createMonster(): Node {
    const monster = this.createNode('Monster', 330, 330);
    monster.setPosition(0, 230);

    const graphics = monster.addComponent(Graphics);
    graphics.fillColor = new Color(100, 48, 55, 255);
    graphics.circle(0, 0, 150);
    graphics.fill();
    graphics.fillColor = new Color(210, 120, 79, 255);
    graphics.circle(-48, 35, 18);
    graphics.circle(48, 35, 18);
    graphics.fill();

    const button = monster.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.94;
    this.contentRoot.addChild(monster);
    return monster;
  }

  private createHpBar(): Graphics {
    const bar = this.createNode('HpBar', 560, 38);
    bar.setPosition(0, 115);
    const graphics = bar.addComponent(Graphics);
    this.contentRoot.addChild(bar);
    return graphics;
  }

  private createButton(name: string, x: number, y: number): Node {
    const node = this.createNode(name, 390, 100);
    node.setPosition(x, y);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(184, 133, 54, 255);
    graphics.roundRect(-195, -50, 390, 100, 16);
    graphics.fill();

    const button = node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.96;
    this.contentRoot.addChild(node);
    return node;
  }

  private createSmallButton(name: string, x: number, y: number): Node {
    const node = this.createNode(name, 120, 80);
    node.setPosition(x, y);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(50, 58, 72, 255);
    graphics.roundRect(-60, -40, 120, 80, 10);
    graphics.fill();

    const button = node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.96;
    this.contentRoot.addChild(node);
    return node;
  }

  private createWideSmallButton(name: string, x: number, y: number): Node {
    const node = this.createNode(name, 170, 80);
    node.setPosition(x, y);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(50, 58, 72, 255);
    graphics.roundRect(-85, -40, 170, 80, 10);
    graphics.fill();

    const button = node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.96;
    this.contentRoot.addChild(node);
    return node;
  }

  private createSkillButtons(): void {
    const positions = [-255, -85, 85, 255];
    positions.forEach((x, index) => {
      const button = this.createNode(`SkillButton${index + 1}`, 150, 90);
      button.setPosition(x, -525);
      const graphics = button.addComponent(Graphics);
      graphics.fillColor = new Color(63, 74, 92, 255);
      graphics.roundRect(-75, -45, 150, 90, 12);
      graphics.fill();
      const buttonComponent = button.addComponent(Button);
      buttonComponent.transition = Button.Transition.SCALE;
      buttonComponent.zoomScale = 0.95;
      const label = this.createLabelNode(button, '技能槽', 18, 140);
      const handler = (): void => this.onSkillClicked(index);
      button.on(Button.EventType.CLICK, handler, this);
      this.contentRoot.addChild(button);
      this.skillButtons.push(button);
      this.skillLabels.push(label);
      this.skillHandlers.push(handler);
    });
  }

  private createLabel(name: string, fontSize: number, x: number, y: number): Label {
    const node = this.createNode(name, 690, 64);
    node.setPosition(x, y);
    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = new Color(232, 232, 226, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    this.contentRoot.addChild(node);
    return label;
  }

  private createLabelNode(parent: Node, text: string, fontSize: number, width = 360): Label {
    const node = this.createNode(`${parent.name}Label`, width, 80);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = new Color(25, 28, 34, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    parent.addChild(node);
    return label;
  }

  private createNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
  }

  private formatOfflineReward(reward: OfflineReward): string {
    if (reward.elapsedSeconds < 60) {
      return `离线 ${reward.elapsedSeconds} 秒 · 未满 1 分钟，暂无收益`;
    }

    const totalMinutes = Math.floor(reward.rewardedSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const duration = hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
    return `离线 ${duration} · 收益 +${reward.gold} 金币`;
  }

  private render(snapshot: BattleSnapshot): void {
    this.stageLabel.string = `关卡 ${snapshot.stage}`;
    if (snapshot.isPaused) {
      this.statusLabel.string = '战斗已暂停';
    } else if (snapshot.state === 'failed') {
      this.statusLabel.string = '挑战失败：Boss 已狂暴';
    } else if (snapshot.enemyKind === 'boss') {
      this.statusLabel.string = `章节 Boss · 剩余 ${Math.ceil(
        snapshot.bossSecondsRemaining ?? 0,
      )} 秒`;
    } else {
      this.statusLabel.string = '烬境魔物';
    }
    this.goldLabel.string = `金币 ${snapshot.gold}`;
    this.hpLabel.string = `${snapshot.monsterHp} / ${snapshot.monsterMaxHp}`;
    this.heroLabel.string =
      `主角 Lv.${snapshot.heroLevel} · 队伍 DPS ${snapshot.totalDps.toFixed(1)}` +
      ` · 支援 ${snapshot.deployedSupportCount}/3`;
    this.formationLabel.string = `自动编队 ${snapshot.unlockedHeroCount}/8`;
    snapshot.skillSlots.forEach((slot, index) => {
      const label = this.skillLabels[index];
      if (!slot.isUnlocked) {
        label.string = `${slot.name}\n第 ${slot.unlockStage ?? '-'} 关解锁`;
      } else if (slot.cooldownRemaining > 0) {
        label.string = `${slot.name}\n${Math.ceil(slot.cooldownRemaining)} 秒`;
      } else {
        label.string = `${slot.name}\n可释放`;
      }
    });
    this.upgradeLabel.string = `升级英雄  ${snapshot.upgradeCost} 金币`;
    this.pauseLabel.string = snapshot.isPaused ? '继续' : '暂停';
    this.pauseButton.active = snapshot.state === 'fighting';
    this.retryButton.active = snapshot.state === 'failed';
    this.upgradeButton.active = snapshot.state !== 'failed';

    const ratio = snapshot.monsterHp / snapshot.monsterMaxHp;
    this.hpBar.clear();
    this.hpBar.fillColor = new Color(54, 57, 66, 255);
    this.hpBar.roundRect(-280, -19, 560, 38, 12);
    this.hpBar.fill();
    this.hpBar.fillColor = new Color(185, 62, 69, 255);
    this.hpBar.roundRect(-276, -15, 552 * ratio, 30, 9);
    this.hpBar.fill();
  }

  private onMonsterClicked(): void {
    this.model.clickAttack();
    this.render(this.model.getSnapshot());
    this.persistIfChanged();
  }

  private onUpgradeClicked(): void {
    this.model.upgradeHero();
    this.render(this.model.getSnapshot());
    this.persistIfChanged();
  }

  private onRetryClicked(): void {
    this.model.retryBoss();
    this.render(this.model.getSnapshot());
  }

  private onPauseClicked(): void {
    const snapshot = this.model.getSnapshot();
    if (snapshot.isPaused) {
      this.model.resume();
    } else {
      this.model.pause();
    }
    this.render(this.model.getSnapshot());
  }

  private onFormationClicked(): void {
    this.model.autoDeployStrongestSupports();
    this.render(this.model.getSnapshot());
    this.persistIfChanged();
  }

  private onSkillClicked(slotIndex: number): void {
    this.model.castSkill(slotIndex);
    this.render(this.model.getSnapshot());
    this.persistIfChanged();
  }

  private persistIfChanged(): void {
    const revision = this.model.getProgressRevision();
    if (revision === this.lastPersistedRevision) {
      return;
    }

    this.lastPersistedRevision = revision;
    this.onProgressChanged(this.model.exportProgress());
  }
}
