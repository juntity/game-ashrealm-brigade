import { game, Game, sys } from 'cc';
import { KeyValueStorage, PlatformAdapter } from './PlatformAdapter';

export class CocosPlatformAdapter implements PlatformAdapter {
  public readonly storage: KeyValueStorage = sys.localStorage;

  public now(): number {
    return Date.now();
  }

  public onHide(callback: () => void): () => void {
    game.on(Game.EVENT_HIDE, callback);
    return () => game.off(Game.EVENT_HIDE, callback);
  }

  public onShow(callback: () => void): () => void {
    game.on(Game.EVENT_SHOW, callback);
    return () => game.off(Game.EVENT_SHOW, callback);
  }
}
