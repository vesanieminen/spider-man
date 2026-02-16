import TWEEN from '@tweenjs/tween.js';

// Global tween group for the game
const tweenGroup = new TWEEN.Group();

export const TweenManager = {
  group: tweenGroup,

  update(time) {
    tweenGroup.update(time);
  },

  add(target, props, duration, options = {}) {
    const tween = new TWEEN.Tween(target, tweenGroup)
      .to(props, duration);

    if (options.ease === 'Power2') {
      tween.easing(TWEEN.Easing.Quadratic.Out);
    } else if (options.ease === 'Cubic') {
      tween.easing(TWEEN.Easing.Cubic.Out);
    } else if (options.ease) {
      tween.easing(TWEEN.Easing.Quadratic.Out);
    }

    if (options.yoyo) tween.yoyo(true);
    if (options.repeat) tween.repeat(options.repeat);
    if (options.delay) tween.delay(options.delay);
    if (options.onUpdate) tween.onUpdate(options.onUpdate);
    if (options.onComplete) tween.onComplete(options.onComplete);

    tween.start();
    return tween;
  },

  // Counter tween: animates {value} from `from` to `to`
  addCounter(from, to, duration, onUpdate, onComplete) {
    const obj = { value: from };
    const tween = new TWEEN.Tween(obj, tweenGroup)
      .to({ value: to }, duration)
      .onUpdate(() => onUpdate(obj.value))
      .start();
    if (onComplete) tween.onComplete(onComplete);
    return tween;
  },

  removeAll() {
    tweenGroup.removeAll();
  },
};
