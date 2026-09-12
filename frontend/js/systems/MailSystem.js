/**
 * 邮件系统
 * 系统公告、活动奖励、补偿邮件、运营发奖
 * 支持附件奖励领取
 */
import { Events } from '../core/EventBus.js';

export class MailSystem {
    constructor(eventBus, saveData, economy, itemSystem) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;
        this.itemSystem = itemSystem;

        this.mails = saveData.mails || [];
        this.saveData.mails = this.mails;

        // 初始化时发送欢迎邮件
        this._initWelcomeMail();
    }

    /**
     * 初始化欢迎邮件
     */
    _initWelcomeMail() {
        const hasWelcome = this.mails.some(m => m.id === 'welcome');
        if (!hasWelcome) {
            this.sendMail({
                id: 'welcome',
                type: 'system',
                title: '欢迎来到东海龙宫！',
                sender: '龙宫总管',
                content: '尊敬的玩家，欢迎来到《捕鱼达人·东海龙宫》！\n\n点击屏幕发射炮弹，击杀鱼类获得金币。\n\n新手礼包已放入附件，请查收！',
                attachments: { coins: 5000, diamonds: 5, items: { lock: 2, rage: 1 } },
                timestamp: Date.now(),
                read: false,
                claimed: false
            });
        }
    }

    /**
     * 发送邮件
     */
    sendMail(mail) {
        const newMail = {
            id: mail.id || `mail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: mail.type || 'system', // system / event / reward / compensation
            title: mail.title || '系统邮件',
            sender: mail.sender || '系统',
            content: mail.content || '',
            attachments: mail.attachments || {},
            timestamp: mail.timestamp || Date.now(),
            read: false,
            claimed: false
        };
        this.mails.unshift(newMail);
        // 最多保留50封
        if (this.mails.length > 50) {
            this.mails = this.mails.slice(0, 50);
        }
        this.eventBus.emit(Events.SHOW_TOAST, `📬 新邮件：${newMail.title}`);
        return newMail;
    }

    /**
     * 标记已读
     */
    markRead(mailId) {
        const mail = this.mails.find(m => m.id === mailId);
        if (mail) {
            mail.read = true;
        }
    }

    /**
     * 全部标记已读
     */
    markAllRead() {
        this.mails.forEach(m => m.read = true);
    }

    /**
     * 领取邮件附件
     */
    claimAttachment(mailId) {
        const mail = this.mails.find(m => m.id === mailId);
        if (!mail || mail.claimed) return false;

        const att = mail.attachments;
        if (!att || Object.keys(att).length === 0) return false;

        // 发放奖励
        if (att.coins) {
            this.economy.addCoins(att.coins, 'mail_reward');
        }
        if (att.diamonds) {
            this.economy.addDiamonds(att.diamonds);
        }
        if (att.items) {
            for (const [item, count] of Object.entries(att.items)) {
                this.itemSystem.addItem(item, count);
            }
        }

        mail.claimed = true;
        mail.read = true;
        this.eventBus.emit(Events.SHOW_TOAST, `领取邮件奖励成功！`);
        return true;
    }

    /**
     * 一键领取所有未领取附件
     */
    claimAll() {
        let claimed = 0;
        this.mails.forEach(mail => {
            if (!mail.claimed && mail.attachments && Object.keys(mail.attachments).length > 0) {
                this.claimAttachment(mail.id);
                claimed++;
            }
        });
        return claimed;
    }

    /**
     * 删除邮件
     */
    deleteMail(mailId) {
        const index = this.mails.findIndex(m => m.id === mailId);
        if (index > -1) {
            this.mails.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 清理已读且已领取的邮件
     */
    cleanReadClaimed() {
        const before = this.mails.length;
        this.mails = this.mails.filter(m => !m.read || !m.claimed);
        return before - this.mails.length;
    }

    /**
     * 获取所有邮件
     */
    getAllMails() {
        return this.mails.map(m => ({
            ...m,
            timeStr: this._formatTime(m.timestamp),
            hasAttachment: m.attachments && Object.keys(m.attachments).length > 0
        }));
    }

    /**
     * 获取未读邮件数
     */
    getUnreadCount() {
        return this.mails.filter(m => !m.read).length;
    }

    /**
     * 获取可领取附件数
     */
    getClaimableCount() {
        return this.mails.filter(m => !m.claimed && m.attachments && Object.keys(m.attachments).length > 0).length;
    }

    _formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
}
