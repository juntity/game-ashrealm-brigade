import { Button, Color, Graphics, Label, Layers, Node, UITransform } from 'cc';
import { TaskCategory } from '../config/TaskConfig';
import { TaskTracker } from '../modules/task/TaskTracker';
import { SaveData } from '../save/SaveData';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ScreenAdapter } from '../ui/ScreenAdapter';

export class TaskScreen {
  public readonly node = new Node('TaskScreen');

  private readonly contentRoot: Node;
  private saveData: SaveData;
  private category: TaskCategory = 'daily';
  private message = '';

  public constructor(
    parent: Node,
    initialSave: SaveData,
    private readonly now: () => number,
    private readonly onSave: (next: SaveData) => SaveData,
  ) {
    this.saveData = cloneSave(initialSave);
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    parent.addChild(this.node);
    this.createBackground();
    this.contentRoot = new ScreenAdapter().createSafeContent(this.node, 'TaskSafeContent');
    this.render();
  }

  public destroy(): void {
    this.node.destroy();
  }

  public synchronizeSave(save: SaveData): void {
    this.saveData = cloneSave(save);
    this.render();
  }

  private render(): void {
    this.contentRoot.destroyAllChildren();
    this.createLabel('任务', 40, 590, new Color(232, 232, 226, 255));
    this.createLabel(
      `金币 ${this.saveData.player.gold}  ·  装备精华 ${this.saveData.player.equipmentEssence}`,
      22,
      540,
      new Color(232, 232, 226, 255),
    );
    this.createButton(
      'DailyTab',
      '每日任务',
      -180,
      465,
      260,
      () => {
        this.category = 'daily';
        this.render();
      },
      this.category === 'daily',
    );
    this.createButton(
      'AchievementTab',
      '成就',
      180,
      465,
      260,
      () => {
        this.category = 'achievement';
        this.render();
      },
      this.category === 'achievement',
    );

    const tracker = new TaskTracker(this.saveData.tasks, this.now());
    const tasks = tracker.getTasks(this.category);
    tasks.forEach((task, index) => {
      const rewardName = task.config.rewardType === 'gold' ? '金币' : '装备精华';
      const state = task.claimed ? '已领取' : task.completed ? '可领取' : '进行中';
      const text = `${task.config.name}\n${task.progress}/${task.config.target} · 奖励 ${
        task.config.rewardAmount
      } ${rewardName} · ${state}`;
      this.createButton(
        `Task_${task.config.id}`,
        text,
        0,
        355 - index * 115,
        680,
        () => this.claim(task.config.id),
        task.completed && !task.claimed,
        94,
      );
    });
    this.createLabel(this.message, 19, -500, new Color(242, 207, 128, 255));
  }

  private claim(taskId: string): void {
    const tracker = new TaskTracker(this.saveData.tasks, this.now());
    const outcome = tracker.claim(taskId, this.saveData.player);
    if (outcome.result === 'claimed') {
      this.saveData = this.onSave({
        ...this.saveData,
        player: outcome.player,
        tasks: tracker.toSave(),
      });
      this.message = '奖励领取成功';
    } else if (outcome.result === 'already-claimed') {
      this.message = '奖励已经领取';
    } else {
      this.message = '任务尚未完成';
    }
    this.render();
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
    callback: () => void,
    highlighted: boolean,
    height = 76,
  ): void {
    const node = this.createNode(name, width, height);
    node.setPosition(x, y);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = highlighted ? new Color(184, 133, 54, 255) : new Color(50, 58, 72, 255);
    graphics.roundRect(-width / 2, -height / 2, width, height, 10);
    graphics.fill();
    node.addComponent(Button).transition = Button.Transition.SCALE;
    node.on(Button.EventType.CLICK, callback, this);
    const labelNode = this.createNode(`${name}Label`, width - 20, height - 8);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 20;
    label.lineHeight = 27;
    label.color = new Color(232, 232, 226, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    node.addChild(labelNode);
    this.contentRoot.addChild(node);
  }

  private createLabel(text: string, fontSize: number, y: number, color: Color): void {
    const node = this.createNode(`Label_${y}`, 690, 60);
    node.setPosition(0, y);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 7;
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

function cloneSave(save: SaveData): SaveData {
  return JSON.parse(JSON.stringify(save)) as SaveData;
}
