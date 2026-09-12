/**
 * 新手引导系统
 * 分步引导新玩家了解游戏玩法
 * 提升首次体验，降低流失
 */
import { Events } from '../core/EventBus.js';

export const TutorialSteps = [
    {
        id: 'welcome',
        title: '欢迎来到东海龙宫！',
        content: '在这里，你将化身为龙宫捕鱼达人，驾驶炮台捕获各种深海鱼类。准备好了吗？',
        icon: '🐉',
        highlight: null,
        buttonText: '开始冒险'
    },
    {
        id: 'fire',
        title: '发射炮弹',
        content: '点击屏幕任意位置即可发射炮弹！炮弹会朝点击方向飞行，命中鱼类即可获得金币。',
        icon: '💥',
        highlight: 'game-canvas',
        buttonText: '我知道了'
    },
    {
        id: 'cannon',
        title: '切换炮台倍率',
        content: '使用底部的 +/- 按钮切换炮台倍率（1-10倍）。倍率越高，消耗金币越多，但威力也越大！',
        icon: '🔫',
        highlight: 'cannon-controls',
        buttonText: '下一步'
    },
    {
        id: 'auto',
        title: '自动发射',
        content: '点击"自动"按钮可开启自动发射模式，炮台会自动瞄准并发射，解放双手！',
        icon: '⚡',
        highlight: 'auto-btn',
        buttonText: '下一步'
    },
    {
        id: 'items',
        title: '道具系统',
        content: '右侧道具栏可使用锁定道具（自动追踪鱼）和狂暴道具（炮弹威力翻倍）。合理使用道具能大幅提升收益！',
        icon: '🎒',
        highlight: 'sidebar',
        buttonText: '下一步'
    },
    {
        id: 'skills',
        title: '技能系统',
        content: '底部技能栏可释放全屏冰冻、闪电链、金币雨三大技能。击杀鱼类可积累能量，能量满后即可释放！',
        icon: '✨',
        highlight: 'skill-bar',
        buttonText: '下一步'
    },
    {
        id: 'boss',
        title: 'BOSS挑战',
        content: '东海龙王会定期出现，击杀BOSS可获得大量金币和稀有奖励！BOSS血量高，建议使用高倍炮和技能配合。',
        icon: '🐲',
        highlight: null,
        buttonText: '下一步'
    },
    {
        id: 'shop',
        title: '商城与VIP',
        content: '金币不足时可前往商城购买礼包。充值可提升VIP等级，解锁专属炮台皮肤、暴击率提升等特权！',
        icon: '🏪',
        highlight: 'coin-add-btn',
        buttonText: '开始游戏'
    }
];

export class TutorialSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;

        this.currentStep = 0;
        this.active = false;
        this.tutorialCompleted = saveData.tutorialCompleted || false;
    }

    /**
     * 开始新手引导
     */
    start() {
        if (this.tutorialCompleted) return false;
        this.currentStep = 0;
        this.active = true;
        this._showStep();
        return true;
    }

    /**
     * 强制重新开始引导
     */
    forceStart() {
        this.currentStep = 0;
        this.active = true;
        this.tutorialCompleted = false;
        this._showStep();
    }

    /**
     * 显示当前步骤
     */
    _showStep() {
        const step = TutorialSteps[this.currentStep];
        if (!step) {
            this.complete();
            return;
        }
        this.eventBus.emit('tutorial:show', step);
    }

    /**
     * 下一步
     */
    next() {
        if (!this.active) return;
        this.currentStep++;
        if (this.currentStep >= TutorialSteps.length) {
            this.complete();
        } else {
            this._showStep();
        }
    }

    /**
     * 跳过引导
     */
    skip() {
        this.complete();
    }

    /**
     * 完成引导
     */
    complete() {
        this.active = false;
        this.tutorialCompleted = true;
        this.saveData.tutorialCompleted = true;
        this.eventBus.emit('tutorial:complete');
        this.eventBus.emit(Events.SHOW_TOAST, '新手引导完成！赠送5000金币！');
    }

    /**
     * 是否已完成
     */
    isCompleted() {
        return this.tutorialCompleted;
    }

    /**
     * 获取当前步骤
     */
    getCurrentStep() {
        return this.active ? TutorialSteps[this.currentStep] : null;
    }

    /**
     * 获取进度
     */
    getProgress() {
        return {
            current: this.currentStep + 1,
            total: TutorialSteps.length,
            percent: ((this.currentStep + 1) / TutorialSteps.length) * 100
        };
    }
}
