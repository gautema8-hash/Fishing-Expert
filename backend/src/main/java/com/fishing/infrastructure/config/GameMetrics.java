package com.fishing.infrastructure.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 自定义业务指标 - Prometheus监控
 *
 * @author 后端架构组
 */
@Component
public class GameMetrics {

    private final MeterRegistry meterRegistry;

    private Counter loginCounter;
    private Counter registerCounter;
    private Counter coinSpendCounter;
    private Counter coinEarnCounter;
    private Counter bulletFireCounter;
    private Counter fishKillCounter;
    private Counter bossKillCounter;
    private Counter critCounter;
    private Counter orderCreateCounter;
    private Counter orderPayCounter;
    private Counter antiCheatBlockCounter;

    private AtomicLong onlinePlayers;
    private AtomicLong totalCoins;
    private AtomicLong totalPlayers;

    private Timer apiResponseTimer;

    public GameMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void init() {
        // 计数器
        loginCounter = Counter.builder("fishing.login.total")
                .description("总登录次数")
                .register(meterRegistry);

        registerCounter = Counter.builder("fishing.register.total")
                .description("总注册次数")
                .register(meterRegistry);

        coinSpendCounter = Counter.builder("fishing.coin.spend.total")
                .description("金币消耗总量")
                .register(meterRegistry);

        coinEarnCounter = Counter.builder("fishing.coin.earn.total")
                .description("金币获得总量")
                .register(meterRegistry);

        bulletFireCounter = Counter.builder("fishing.bullet.fire.total")
                .description("炮弹发射总数")
                .register(meterRegistry);

        fishKillCounter = Counter.builder("fishing.fish.kill.total")
                .description("鱼类击杀总数")
                .register(meterRegistry);

        bossKillCounter = Counter.builder("fishing.boss.kill.total")
                .description("BOSS击杀总数")
                .register(meterRegistry);

        critCounter = Counter.builder("fishing.crit.total")
                .description("暴击总数")
                .register(meterRegistry);

        orderCreateCounter = Counter.builder("fishing.order.create.total")
                .description("订单创建总数")
                .register(meterRegistry);

        orderPayCounter = Counter.builder("fishing.order.pay.total")
                .description("订单支付总数")
                .register(meterRegistry);

        antiCheatBlockCounter = Counter.builder("fishing.anticheat.block.total")
                .description("反作弊拦截次数")
                .register(meterRegistry);

        // 仪表盘
        onlinePlayers = meterRegistry.gauge("fishing.online.players", new AtomicLong(0));
        totalCoins = meterRegistry.gauge("fishing.coins.total", new AtomicLong(0));
        totalPlayers = meterRegistry.gauge("fishing.players.total", new AtomicLong(0));

        // 计时器
        apiResponseTimer = Timer.builder("fishing.api.response.time")
                .description("API响应时间")
                .register(meterRegistry);
    }

    public void incrementLogin() { loginCounter.increment(); }
    public void incrementRegister() { registerCounter.increment(); }
    public void incrementCoinSpend(double amount) { coinSpendCounter.increment(amount); }
    public void incrementCoinEarn(double amount) { coinEarnCounter.increment(amount); }
    public void incrementBulletFire() { bulletFireCounter.increment(); }
    public void incrementFishKill() { fishKillCounter.increment(); }
    public void incrementBossKill() { bossKillCounter.increment(); }
    public void incrementCrit() { critCounter.increment(); }
    public void incrementOrderCreate() { orderCreateCounter.increment(); }
    public void incrementOrderPay() { orderPayCounter.increment(); }
    public void incrementAntiCheatBlock() { antiCheatBlockCounter.increment(); }

    public void setOnlinePlayers(long count) { onlinePlayers.set(count); }
    public void setTotalCoins(long amount) { totalCoins.set(amount); }
    public void setTotalPlayers(long count) { totalPlayers.set(count); }

    public Timer getApiResponseTimer() { return apiResponseTimer; }
}
