package com.fishing;

import lombok.extern.slf4j.Slf4j;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 捕鱼达人·东海龙宫 - 后端服务启动类
 *
 * @author 后端架构组
 * @since 1.0.0
 */
@Slf4j
@SpringBootApplication
@EnableAsync
@EnableScheduling
@MapperScan("com.fishing.infrastructure.persistence.repository")
public class FishingApplication {

    public static void main(String[] args) {
        SpringApplication.run(FishingApplication.class, args);
        log.info("========================================");
        log.info("  捕鱼达人·东海龙宫 后端服务启动成功!");
        log.info("  API文档: http://localhost:8081/api/doc.html");
        log.info("========================================");
    }
}
