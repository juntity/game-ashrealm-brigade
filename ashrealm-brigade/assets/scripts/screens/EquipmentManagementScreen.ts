import { Button, Color, Graphics, Label, Layers, Node, UITransform } from 'cc';
import {
  EQUIPMENT_CONFIG,
  EquipmentRarity,
  EquipmentSlot,
  EquipmentTemplateConfig,
} from '../config/EquipmentConfig';
import { EquipmentBag, EquipmentSortKey } from '../modules/bag/EquipmentBag';
import { EquipmentInventory } from '../modules/equip/EquipmentInventory';
import { EquipmentWorkshop } from '../modules/equip/EquipmentWorkshop';
import { SaveData } from '../save/SaveData';
import { DESIGN_HEIGHT, DESIGN_WIDTH, ScreenAdapter } from '../ui/ScreenAdapter';

export type EquipmentPageMode = 'equipment' | 'bag';

const SLOT_NAMES: Readonly<Record<EquipmentSlot, string>> = {
  weapon: '武器',
  helmet: '头盔',
  armor: '护甲',
  bracer: '护腕',
  boots: '鞋子',
  necklace: '项链',
  ring: '戒指',
};

const RARITY_NAMES: Readonly<Record<EquipmentRarity, string>> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythic: '神话',
};

export class EquipmentManagementScreen {
  public readonly node = new Node('EquipmentManagementScreen');

  private readonly screenAdapter = new ScreenAdapter();
  private readonly contentRoot: Node;
  private saveData: SaveData;
  private selectedInstanceId: string | null = null;
  private slotFilter: EquipmentSlot | null = null;
  private rarityFilter: EquipmentRarity | null = null;
  private sortBy: EquipmentSortKey = 'rarity';
  private message = '';

  public constructor(
    parent: Node,
    private readonly mode: EquipmentPageMode,
    initialSave: SaveData,
    private readonly onSave: (next: SaveData) => SaveData,
  ) {
    this.saveData = cloneSave(initialSave);
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    parent.addChild(this.node);
    this.createBackground();
    this.contentRoot = this.screenAdapter.createSafeContent(this.node, 'EquipmentSafeContent');
    this.render();
  }

  public destroy(): void {
    this.node.destroy();
  }

  private render(): void {
    this.contentRoot.destroyAllChildren();
    this.createLabel(this.mode === 'equipment' ? '装备' : '背包', 40, 0, 590, 680);
    this.createLabel(
      `金币 ${this.saveData.player.gold}  ·  装备精华 ${this.saveData.player.equipmentEssence}`,
      22,
      0,
      540,
      680,
    );
    if (this.mode === 'equipment') {
      this.renderEquipmentPage();
    } else {
      this.renderBagPage();
    }
    this.createLabel(this.message, 19, 0, -530, 690, new Color(242, 207, 128, 255));
  }

  private renderEquipmentPage(): void {
    const inventory = new EquipmentInventory(this.saveData.equipment);
    const equippedStats = inventory.getEquippedStats();
    this.createLabel(
      `固定攻击 +${equippedStats['attack-flat'].toFixed(1)}  ·  攻击加成 +${formatPercent(
        equippedStats['attack-multiplier'],
      )}`,
      20,
      0,
      490,
      690,
    );

    const slots = Object.keys(SLOT_NAMES) as EquipmentSlot[];
    slots.forEach((slot, index) => {
      const instanceId = this.saveData.equipment.equippedBySlot[slot];
      const item = instanceId === undefined ? null : inventory.get(instanceId);
      const template = item === null ? null : getTemplate(item.templateId);
      const text =
        item === null
          ? `${SLOT_NAMES[slot]}  ·  未穿戴`
          : `${SLOT_NAMES[slot]}  ·  ${template.name}  ${RARITY_NAMES[item.rarity]} Lv.${
              item.level
            }  +${item.enhanceLevel}  ${item.starLevel}★`;
      this.createListButton(
        `Slot_${slot}`,
        text,
        0,
        420 - index * 92,
        () => {
          this.selectedInstanceId = item?.instanceId ?? null;
          this.message = item === null ? '该部位尚未穿戴装备' : `已选择 ${template?.name ?? ''}`;
          this.render();
        },
        item?.instanceId === this.selectedInstanceId,
      );
    });

    this.createActionButton('AutoEquip', '一键穿戴', -240, -275, () => this.autoEquip());
    this.createActionButton('Enhance', '强化', 0, -275, () => this.enhance());
    this.createActionButton('StarUp', '升星', 240, -275, () => this.starUp());
    this.createActionButton('Unequip', '卸下', 0, -375, () => this.unequip());
  }

  private renderBagPage(): void {
    const entries = new EquipmentBag(this.saveData.equipment).query({
      slots: this.slotFilter === null ? undefined : [this.slotFilter],
      rarities: this.rarityFilter === null ? undefined : [this.rarityFilter],
      sortBy: this.sortBy,
    });
    this.createActionButton(
      'SlotFilter',
      `部位：${this.slotFilter === null ? '全部' : SLOT_NAMES[this.slotFilter]}`,
      -230,
      465,
      () => this.cycleSlotFilter(),
      205,
    );
    this.createActionButton(
      'RarityFilter',
      `品质：${this.rarityFilter === null ? '全部' : RARITY_NAMES[this.rarityFilter]}`,
      0,
      465,
      () => this.cycleRarityFilter(),
      205,
    );
    const sortName = this.sortBy === 'rarity' ? '品质' : this.sortBy === 'level' ? '等级' : '属性';
    this.createActionButton('Sort', `排序：${sortName}`, 230, 465, () => this.cycleSort(), 205);

    entries.slice(0, 8).forEach((entry, index) => {
      const template = getTemplate(entry.item.templateId);
      const markers = `${entry.equipped ? ' [穿戴]' : ''}${entry.item.protected ? ' [保护]' : ''}`;
      this.createListButton(
        `Bag_${entry.item.instanceId}`,
        `${SLOT_NAMES[entry.slot]} · ${template.name} · ${RARITY_NAMES[entry.item.rarity]} Lv.${
          entry.item.level
        } · 评分 ${entry.score.toFixed(1)}${markers}`,
        0,
        385 - index * 82,
        () => {
          this.selectedInstanceId = entry.item.instanceId;
          this.message = `已选择 ${template.name}`;
          this.render();
        },
        entry.item.instanceId === this.selectedInstanceId,
        680,
        68,
        18,
      );
    });
    if (entries.length === 0) {
      this.createLabel('暂无装备，返回战斗击败魔物后可获得掉落', 24, 0, 160, 680);
    } else if (entries.length > 8) {
      this.createLabel(`当前显示前 8 件，共 ${entries.length} 件`, 17, 0, -285, 680);
    }

    this.createActionButton('Equip', '穿戴', -270, -390, () => this.equipSelected(), 155);
    this.createActionButton('Protect', '保护切换', -90, -390, () => this.toggleProtection(), 175);
    this.createActionButton('Sell', '出售', 100, -390, () => this.sellSelected(), 155);
    this.createActionButton('Salvage', '分解', 275, -390, () => this.salvageSelected(), 155);
  }

  private autoEquip(): void {
    const workshop = this.createWorkshop();
    const result = workshop.autoEquipBest();
    this.commitWorkshop(workshop);
    this.message =
      result.changedSlots.length === 0
        ? '当前已经是综合属性最高的装备'
        : `已优化 ${result.changedSlots.length} 个部位`;
    this.render();
  }

  private enhance(): void {
    if (this.selectedInstanceId === null) {
      this.showMessage('请先选择一件已穿戴装备');
      return;
    }
    const workshop = this.createWorkshop();
    const cost = workshop.getEnhanceCost(this.selectedInstanceId);
    const result = workshop.enhance(this.selectedInstanceId);
    if (result === 'changed') {
      this.commitWorkshop(workshop);
      this.message = `强化成功，消耗 ${cost ?? 0} 金币`;
    } else {
      this.message = progressionMessage(result);
    }
    this.render();
  }

  private starUp(): void {
    if (this.selectedInstanceId === null) {
      this.showMessage('请先选择一件已穿戴装备');
      return;
    }
    const workshop = this.createWorkshop();
    const cost = workshop.getStarCost(this.selectedInstanceId);
    const result = workshop.starUp(this.selectedInstanceId);
    if (result === 'changed') {
      this.commitWorkshop(workshop);
      this.message = `升星成功，消耗 ${cost ?? 0} 装备精华`;
    } else {
      this.message = progressionMessage(result);
    }
    this.render();
  }

  private unequip(): void {
    if (this.selectedInstanceId === null) {
      this.showMessage('请先选择一件已穿戴装备');
      return;
    }
    const item = new EquipmentInventory(this.saveData.equipment).get(this.selectedInstanceId);
    if (item === null) {
      this.showMessage('装备不存在');
      return;
    }
    const inventory = new EquipmentInventory(this.saveData.equipment);
    inventory.unequip(getTemplate(item.templateId).slot);
    this.saveEquipment(inventory.toSave());
    this.selectedInstanceId = null;
    this.message = '已卸下装备';
    this.render();
  }

  private equipSelected(): void {
    if (this.selectedInstanceId === null) {
      this.showMessage('请先选择背包装备');
      return;
    }
    const inventory = new EquipmentInventory(this.saveData.equipment);
    const result = inventory.equip(this.selectedInstanceId);
    if (result === 'not-found') {
      this.showMessage('装备不存在');
      return;
    }
    this.saveEquipment(inventory.toSave());
    this.message = result === 'already-equipped' ? '该装备已穿戴' : '穿戴成功';
    this.render();
  }

  private toggleProtection(): void {
    if (this.selectedInstanceId === null) {
      this.showMessage('请先选择背包装备');
      return;
    }
    const bag = new EquipmentBag(this.saveData.equipment);
    const item = this.saveData.equipment.inventory.find(
      (entry) => entry.instanceId === this.selectedInstanceId,
    );
    if (item === undefined) {
      this.showMessage('装备不存在');
      return;
    }
    bag.setProtected(item.instanceId, !item.protected);
    this.saveEquipment(bag.toSave());
    this.message = item.protected ? '已解除保护' : '已保护装备';
    this.render();
  }

  private sellSelected(): void {
    this.removeSelected('sell');
  }

  private salvageSelected(): void {
    this.removeSelected('salvage');
  }

  private removeSelected(operation: 'sell' | 'salvage'): void {
    if (this.selectedInstanceId === null) {
      this.showMessage('请先选择背包装备');
      return;
    }
    const workshop = this.createWorkshop();
    const result =
      operation === 'sell'
        ? workshop.sell([this.selectedInstanceId])
        : workshop.salvage([this.selectedInstanceId]);
    if (result.eligibleInstanceIds.length === 0) {
      const reason = result.blocked[0]?.reason;
      this.message = reason === 'protected' ? '保护中的装备不可操作' : '穿戴中的装备不可操作';
    } else {
      this.commitWorkshop(workshop);
      this.selectedInstanceId = null;
      this.message =
        operation === 'sell'
          ? `出售成功，获得 ${result.goldGained} 金币`
          : `分解成功，获得 ${result.essenceGained} 装备精华`;
    }
    this.render();
  }

  private cycleSlotFilter(): void {
    const values: readonly (EquipmentSlot | null)[] = [
      null,
      'weapon',
      'helmet',
      'armor',
      'bracer',
      'boots',
      'necklace',
      'ring',
    ];
    this.slotFilter = values[(values.indexOf(this.slotFilter) + 1) % values.length];
    this.render();
  }

  private cycleRarityFilter(): void {
    const values: readonly (EquipmentRarity | null)[] = [
      null,
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
      'mythic',
    ];
    this.rarityFilter = values[(values.indexOf(this.rarityFilter) + 1) % values.length];
    this.render();
  }

  private cycleSort(): void {
    const values: readonly EquipmentSortKey[] = ['rarity', 'level', 'score'];
    this.sortBy = values[(values.indexOf(this.sortBy) + 1) % values.length];
    this.render();
  }

  private createWorkshop(): EquipmentWorkshop {
    return new EquipmentWorkshop(this.saveData.player, this.saveData.equipment);
  }

  private commitWorkshop(workshop: EquipmentWorkshop): void {
    this.saveData = this.onSave({
      ...this.saveData,
      player: workshop.getPlayer(),
      equipment: workshop.getEquipment(),
    });
  }

  private saveEquipment(equipment: SaveData['equipment']): void {
    this.saveData = this.onSave({ ...this.saveData, equipment });
  }

  private showMessage(message: string): void {
    this.message = message;
    this.render();
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

  private createActionButton(
    name: string,
    text: string,
    x: number,
    y: number,
    callback: () => void,
    width = 205,
  ): void {
    this.createListButton(name, text, x, y, callback, false, width, 72, 20);
  }

  private createListButton(
    name: string,
    text: string,
    x: number,
    y: number,
    callback: () => void,
    selected: boolean,
    width = 680,
    height = 76,
    fontSize = 20,
  ): void {
    const node = this.createNode(name, width, height);
    node.setPosition(x, y);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = selected ? new Color(184, 133, 54, 255) : new Color(50, 58, 72, 255);
    graphics.roundRect(-width / 2, -height / 2, width, height, 10);
    graphics.fill();
    const button = node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.97;
    node.on(Button.EventType.CLICK, callback, this);
    const labelNode = this.createNode(`${name}Label`, width - 20, height - 8);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.color = new Color(232, 232, 226, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    node.addChild(labelNode);
    this.contentRoot.addChild(node);
  }

  private createLabel(
    text: string,
    fontSize: number,
    x: number,
    y: number,
    width: number,
    color = new Color(232, 232, 226, 255),
  ): void {
    const node = this.createNode(`Label_${y}`, width, 60);
    node.setPosition(x, y);
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

function getTemplate(templateId: string): EquipmentTemplateConfig {
  const template = EQUIPMENT_CONFIG.templates.find((entry) => entry.id === templateId);
  if (template === undefined) {
    throw new Error(`Unknown equipment template: ${templateId}.`);
  }
  return template;
}

function progressionMessage(result: string): string {
  switch (result) {
    case 'insufficient-gold':
      return '金币不足';
    case 'insufficient-essence':
      return '装备精华不足';
    case 'max-level':
      return '已达到当前上限';
    default:
      return '装备不存在';
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function cloneSave(save: SaveData): SaveData {
  return JSON.parse(JSON.stringify(save)) as SaveData;
}
