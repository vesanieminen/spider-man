import { Game } from './core/Game.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const container = document.getElementById('game-container');

const game = new Game(container, [BootScene, TitleScene, GameScene, GameOverScene]);

// Start with boot scene
game.startScene('BootScene');
