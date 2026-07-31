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
import { BattleProgress } from '../modules/battle/BattleModel';
import { OfflineRewardCalculator } from '../modules/offline/OfflineRewardCalculator';
import { EconomyCalculator } from '../modules/economy/EconomyCalculator';
import { GAME_BALANCE } from '../config/GameBalanceConfig';
import { CocosPlatformAdapter } from '../platform/CocosPlatformAdapter';
import { SaveData } from '../save/SaveData';
import { SaveService } from '../save/SaveService';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
  private battleScreen: BattleScreen | null = null;
  private readonly platform = new CocosPlatformAdapter();
  private readonly saveService = new SaveService(this.platform.storage, () => this.platform.now());
  private readonly offlineRewardCalculator = new OfflineRewardCalculator();
  private readonly economyCalculator = new EconomyCalculator();
  private saveData: SaveData | null = null;
  private offlineGold = 0;
  private removeHideListener: (() => void) | null = null;
  private removeShowListener: (() => void) | null = null;

  protected start(): void {
    this.saveData = this.saveService.load();
    this.offlineGold = this.applyOfflineReward();
    this.removeHideListener = this.platform.onHide(() => this.onAppHide());
    this.removeShowListener = this.platform.onShow(() => this.onAppShow());
    this.buildLaunchScreen();
  }

  private buildLaunchScreen(): void {
    this.node.removeAllChildren();

    this.createBackground();
    this.createLabel('烬境旅团', 64, new Color(242, 207, 128, 255), new Vec3(0, 260, 0));
    this.createLabel('ASHREALM BRIGADE', 22, new Color(165, 174, 190, 255), new Vec3(0, 198, 0));
    this.createLabel('集结英雄，穿越烬境', 28, new Color(220, 223, 229, 255), new Vec3(0, 95, 0));
    if (this.offlineGold > 0) {
      this.createLabel(
        `离线收益 +${this.offlineGold} 金币`,
        24,
        new Color(142, 201, 148, 255),
        new Vec3(0, 20, 0),
      );
    }
    this.createStartButton();
    this.createLabel('开发版本 0.1.0', 20, new Color(122, 130, 145, 255), new Vec3(0, -570, 0));
  }

  private createBackground(): void {
    const background = this.createUiNode('Background', DESIGN_WIDTH, DESIGN_HEIGHT);
    const graphics = background.addComponent(Graphics);

    graphics.fillColor = new Color(18, 22, 31, 255);
    graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
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
    this.node.addChild(buttonNode);
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

    this.node.addChild(labelNode);
  }

  private createUiNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
  }

  private onStartGame(): void {
    const saveData = this.requireSaveData();
    this.node.removeAllChildren();
    this.battleScreen = new BattleScreen(
      this.node,
      {
        stage: saveData.progress.stage,
        gold: saveData.player.gold,
        heroLevel: saveData.heroes[0]?.level ?? 1,
      },
      (progress) => this.saveProgress(progress),
    );
  }

  protected update(deltaTime: number): void {
    this.battleScreen?.update(deltaTime);
  }

  protected onDestroy(): void {
    const buttonNode = this.node.getChildByName('StartButton');
    buttonNode?.off(Button.EventType.CLICK, this.onStartGame, this);
    this.battleScreen?.destroy();
    this.battleScreen = null;
    this.removeHideListener?.();
    this.removeShowListener?.();
    this.removeHideListener = null;
    this.removeShowListener = null;
  }

  private saveProgress(progress: BattleProgress): void {
    const current = this.requireSaveData();
    const mainHero = current.heroes[0] ?? {
      heroId: 'hero_main',
      level: 1,
      isDeployed: true,
    };

    this.saveData = this.saveService.save({
      ...current,
      player: {
        ...current.player,
        gold: progress.gold,
      },
      progress: {
        ...current.progress,
        stage: progress.stage,
      },
      heroes: [
        {
          ...mainHero,
          level: progress.heroLevel,
        },
        ...current.heroes.slice(1),
      ],
    });
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
    this.saveData = this.saveService.save(this.saveData);
  }

  private onAppShow(): void {
    const gold = this.applyOfflineReward();
    if (gold > 0) {
      this.battleScreen?.grantOfflineGold(gold);
    }
  }

  private applyOfflineReward(): number {
    const current = this.requireSaveData();
    const heroLevel = current.heroes[0]?.level ?? 1;
    const reward = this.offlineRewardCalculator.calculate({
      lastActiveAt: current.lastActiveAt,
      now: this.platform.now(),
      goldPerMinute: this.economyCalculator.getOfflineGoldPerMinute(
        current.progress.stage,
        heroLevel,
      ),
      maxOfflineSeconds: GAME_BALANCE.economy.offlineMaxHours * 60 * 60,
    });

    if (reward.gold === 0) {
      return 0;
    }

    this.saveData = this.saveService.save({
      ...current,
      player: {
        ...current.player,
        gold: current.player.gold + reward.gold,
      },
    });
    return reward.gold;
  }
}
