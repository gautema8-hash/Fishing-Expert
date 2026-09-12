package com.fishing.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.ApiKey;
import springfox.documentation.service.AuthorizationScope;
import springfox.documentation.service.SecurityReference;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spi.service.contexts.SecurityContext;
import springfox.documentation.spring.web.plugins.Docket;

import java.util.Arrays;
import java.util.List;

/**
 * Knife4j API文档增强配置
 *
 * @author 后端架构组
 */
@Configuration
public class Knife4jConfig {

    /**
     * 玩家API分组
     */
    @Bean
    public Docket playerApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .groupName("玩家接口")
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.fishing.interfaces.controller"))
                .paths(PathSelectors.regex("^/(player|economy|game|signin|mail|redemption|pet|equipment|achievement|task|vip).*"))
                .build()
                .securitySchemes(Arrays.asList(apiKey()))
                .securityContexts(Arrays.asList(securityContext()));
    }

    /**
     * 社交API分组
     */
    @Bean
    public Docket socialApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .groupName("社交接口")
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.fishing.interfaces.controller"))
                .paths(PathSelectors.regex("^/(friend|guild|leaderboard|season|shop).*"))
                .build()
                .securitySchemes(Arrays.asList(apiKey()))
                .securityContexts(Arrays.asList(securityContext()));
    }

    /**
     * 系统API分组
     */
    @Bean
    public Docket systemApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .groupName("系统接口")
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.fishing.interfaces.controller"))
                .paths(PathSelectors.regex("^/(auth|anti-addiction|anti-cheat|analytics|dashboard|world-boss|admin).*"))
                .build()
                .securitySchemes(Arrays.asList(apiKey()))
                .securityContexts(Arrays.asList(securityContext()));
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("捕鱼达人·东海龙宫 API文档")
                .description("商用捕鱼游戏后端API接口文档，包含玩家、经济、社交、系统等全部接口")
                .version("1.0.0")
                .build();
    }

    private ApiKey apiKey() {
        return new ApiKey("Authorization", "Authorization", "header");
    }

    private SecurityContext securityContext() {
        return SecurityContext.builder()
                .securityReferences(defaultAuth())
                .forPaths(PathSelectors.regex("^(?!/auth).*$"))
                .build();
    }

    private List<SecurityReference> defaultAuth() {
        AuthorizationScope authorizationScope = new AuthorizationScope("global", "accessEverything");
        AuthorizationScope[] authorizationScopes = new AuthorizationScope[1];
        authorizationScopes[0] = authorizationScope;
        return Arrays.asList(new SecurityReference("Authorization", authorizationScopes));
    }
}
