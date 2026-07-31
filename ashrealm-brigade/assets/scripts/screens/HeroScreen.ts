import { Button, Color, Graphics, Label, Layers, Node, UITransform } from 'cc';
import { HERO_CONFIG, HeroConfig, MAIN_HERO_ID } from '../config/HeroConfig';
import { SKILL_CONFIG } from '../config/SkillConfig';
import { HeroCalculator } from '../modules/hero/HeroCalculator';
import { HeroManagementService } from '../modules/hero/HeroManagementService';
import { SaveData } from '../save/SaveData';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ScreenAdapter } from '../ui/ScreenAdapter';

export class HeroScreen {
  public readonly node = new Node('HeroScreen');

  private readonly contentRoot: Node;
  private readonly calculator = new HeroCalculator();
  private saveData: SaveData;
  private selectedHeroId = MAIN_HERO_ID;
  private message = '';

  public constructor(
    parent: Node,
    initialSave: SaveData,
    private readonly onSave: (next: SaveData) => SaveData,
  ) {
    this.saveData = cloneSave(initialSave);
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    parent.addChild(this.node);
    this.createBackground();
    this.contentRoot = new ScreenAdapter().createSafeContent(this.node, 'HeroSafeContent');
    this.render();
  }

  public synchronizeSave(save: SaveData): void {
    this.saveData = cloneSave(save);
    this.render();
  }

  public destroy(): void {
    this.node.destroy();
  }

  private render(): void {
    this.contentRoot.destroyAllChildren();
    this.createLabel('英雄', 40, 590, new Color(232, 232, 226, 255));
    this.createLabel(`金币 ${this.saveData.player.gold}`, 22, 540, new Color(232, 232, 226, 255));
    this.saveData.heroes.forEach((hero, index) => {
      const config = requireHeroConfig(hero.heroId);
      const state = !hero.isUnlocked
        ? `第 ${config.unlock.stage} 关解锁`
        : hero.isDeployed
          ? '已上阵'
          : '待命';
      this.createButton(
        `Hero_${hero.heroId}`,
        `${config.name} · Lv.${hero.level} · ${state}`,
        0,
        455 - index * 78,
        680,
        66,
        () => {
          this.selectedHeroId = hero.heroId;
          this.message = `已选择 ${config.name}`;
          this.render();
        },
        hero.heroId === this.selectedHeroId,
      );
    });

    const hero = this.saveData.heroes.find((entry) => entry.heroId === this.selectedHeroId);
    if (hero !== undefined) {
      const config = requireHeroConfig(hero.heroId);
      const activeNames = config.activeSkillIds
        .map((id) => SKILL_CONFIG.activeSkills.find((skill) => skill.id === id)?.name)
        .filter((name): name is string => name !== undefined);
      const passiveNames = config.passiveSkillIds
        .map((id) => SKILL_CONFIG.passiveSkills.find((skill) => skill.id === id)?.name)
        .filter((name): name is string => name !== undefined);
      const cost = new HeroManagementService(
        this.saveData.player,
        this.saveData.heroes,
      ).getUpgradeCost(hero.heroId);
      this.createLabel(
        `攻击 ${this.calculator.getAttack(hero.level, config).toFixed(1)} · 攻击间隔 ${
          config.attackIntervalSeconds
        }秒 · 暴击 ${(config.criticalRate * 100).toFixed(0)}%`,
        18,
        -205,
        new Color(192, 202, 218, 255),
      );
      this.createLabel(
        `主动：${activeNames.join('、') || '无'} · 被动：${passiveNames.join('、') || '无'}`,
        17,
        -255,
        new Color(192, 202, 218, 255),
      );
      this.createButton(
        'UpgradeHero',
        `升级 ${cost ?? '-'} 金币`,
        -225,
        -350,
        210,
        72,
        () => this.upgrade(),
        false,
      );
      this.createButton(
        'DeployHero',
        hero.heroId === MAIN_HERO_ID ? '主角固定上阵' : hero.isDeployed ? '下阵' : '上阵',
        0,
        -350,
        210,
        72,
        () => this.toggleDeploy(),
        hero.isDeployed,
      );
      this.createButton(
        'AutoDeployHeroes',
        '自动编队',
        225,
        -350,
        210,
        72,
        () => this.autoDeploy(),
        false,
      );
    }
    this.createLabel(this.message, 18, -475, new Color(242, 207, 128, 255));
  }

  private upgrade(): void {
    const service = new HeroManagementService(this.saveData.player, this.saveData.heroes);
    const result = service.upgrade(this.selectedHeroId);
    if (result === 'upgraded') {
      this.commit(service);
      this.message = '英雄升级成功';
    } else if (result === 'insufficient-gold') {
      this.message = '金币不足';
    } else if (result === 'locked') {
      this.message = '英雄尚未解锁';
    } else {
      this.message = '英雄不存在';
    }
    this.render();
  }

  private toggleDeploy(): void {
    const hero = this.saveData.heroes.find((entry) => entry.heroId === this.selectedHeroId);
    if (hero === undefined) {
      return;
    }
    const service = new HeroManagementService(this.saveData.player, this.saveData.heroes);
    const result = service.setDeployed(hero.heroId, !hero.isDeployed);
    if (result === 'changed') {
      this.commit(service);
      this.message = hero.isDeployed ? '英雄已下阵' : '英雄已上阵';
    } else if (result === 'full') {
      this.message = '支援位已满，最多上阵 3 名支援';
    } else if (result === 'locked') {
      this.message = '英雄尚未解锁';
    } else {
      this.message = '主角必须保持上阵';
    }
    this.render();
  }

  private autoDeploy(): void {
    const service = new HeroManagementService(this.saveData.player, this.saveData.heroes);
    const changed = service.autoDeploy();
    if (changed) {
      this.commit(service);
    }
    this.message = changed ? '已自动上阵最强支援英雄' : '当前已是推荐阵容';
    this.render();
  }

  private commit(service: HeroManagementService): void {
    this.saveData = this.onSave({
      ...this.saveData,
      player: service.getPlayer(),
      heroes: [...service.getHeroes()],
    });
  }

  private createBackground(): void {
    const size = new ScreenAdapter().getVisibleSize();
    const node = this.createNode('Background', size.width, size.height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(17, 21, 30, 255);
    graphics.rect(-size.width / 2, -size.height / 2, size.width, size.height);
    graphics.fill();
    this.node.addChild(node);
  }

  private createButton(
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    callback: () => void,
    highlighted: boolean,
  ): void {
    const node = this.createNode(name, width, height);
    node.setPosition(x, y);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = highlighted ? new Color(184, 133, 54, 255) : new Color(50, 58, 72, 255);
    graphics.roundRect(-width / 2, -height / 2, width, height, 10);
    graphics.fill();
    node.addComponent(Button).transition = Button.Transition.SCALE;
    node.on(Button.EventType.CLICK, callback, this);
    const labelNode = this.createNode(`${name}Label`, width - 16, height - 6);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 19;
    label.lineHeight = 25;
    label.color = new Color(232, 232, 226, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    node.addChild(labelNode);
    this.contentRoot.addChild(node);
  }

  private createLabel(text: string, fontSize: number, y: number, color: Color): void {
    const node = this.createNode(`Label_${y}`, 700, 55);
    node.setPosition(0, y);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    this.contentRoot.addChild(node);
  }

  private createNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
  }
}

function requireHeroConfig(heroId: string): HeroConfig {
  const config = HERO_CONFIG.heroes.find((hero) => hero.id === heroId);
  if (config === undefined) {
    throw new Error(`Unknown hero: ${heroId}.`);
  }
  return config;
}

function cloneSave(save: SaveData): SaveData {
  return JSON.parse(JSON.stringify(save)) as SaveData;
}
