package com.fishing.infrastructure.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * WebMvc配置 - 注册拦截器和过滤器
 *
 * @author 后端架构组
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final JwtInterceptor jwtInterceptor;

    private final AdminJwtInterceptor adminJwtInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 玩家JWT拦截器
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/auth/**",
                        "/doc.html",
                        "/webjars/**",
                        "/swagger-resources/**",
                        "/v2/api-docs",
                        "/favicon.ico",
                        "/error",
                        "/admin/**"
                );

        // 管理员JWT拦截器，拦截管理API和需要认证的auth端点（login除外）
        registry.addInterceptor(adminJwtInterceptor)
                .addPathPatterns("/admin/api/**", "/admin/auth/info", "/admin/auth/logout")
                .excludePathPatterns(
                        "/admin/auth/login",
                        "/admin/index.html",
                        "/admin/login.html",
                        "/admin/lib/**",
                        "/admin/css/**",
                        "/admin/js/**",
                        "/admin/assets/**"
                );
    }

    /**
     * 配置视图控制器 - 管理后台首页重定向
     */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/admin").setViewName("forward:/admin/index.html");
        registry.addViewController("/admin/").setViewName("forward:/admin/index.html");
    }

    /**
     * 注册XSS防护过滤器
     */
    @Bean
    public FilterRegistrationBean<XssFilter> xssFilterRegistration() {
        FilterRegistrationBean<XssFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new XssFilter());
        registration.addUrlPatterns("/*");
        registration.setName("xssFilter");
        registration.setOrder(1);
        return registration;
    }
}
