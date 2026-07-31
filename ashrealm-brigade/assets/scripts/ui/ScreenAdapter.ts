import { Node, ResolutionPolicy, SafeArea, Size, UITransform, view } from 'cc';

export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;

export class ScreenAdapter {
  public configureView(): void {
    view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_WIDTH);
  }

  public getVisibleSize(): Readonly<Size> {
    return view.getVisibleSize();
  }

  public createSafeContent(parent: Node, name = 'SafeContent'): Node {
    const visibleSize = this.getVisibleSize();
    const safeContent = new Node(name);
    safeContent.addComponent(UITransform).setContentSize(visibleSize.width, visibleSize.height);
    parent.addChild(safeContent);
    safeContent.addComponent(SafeArea).updateArea();
    return safeContent;
  }
}
