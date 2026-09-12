package com.fishing.infrastructure.config;

import com.fishing.common.annotation.ApiVersion;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.condition.RequestCondition;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;

/**
 * API版本控制配置
 * 支持 /api/v1/xxx 格式的版本化API
 *
 * @author 后端架构组
 */
@Configuration
public class ApiVersionConfig implements WebMvcConfigurer {

    /**
     * 版本请求条件
     */
    public static class ApiVersionCondition implements RequestCondition<ApiVersionCondition> {

        private final int version;

        public ApiVersionCondition(int version) {
            this.version = version;
        }

        @Override
        public ApiVersionCondition combine(ApiVersionCondition other) {
            // 方法上的注解优先于类上的
            return new ApiVersionCondition(other.version);
        }

        @Override
        public ApiVersionCondition getMatchingCondition(HttpServletRequest request) {
            String uri = request.getRequestURI();
            // 匹配 /api/v{version}/ 格式
            if (uri.matches(".*/v(\\d+)/.*")) {
                String versionStr = uri.replaceAll(".*/v(\\d+)/.*", "$1");
                int requestVersion = Integer.parseInt(versionStr);
                if (requestVersion >= this.version) {
                    return this;
                }
            }
            return null;
        }

        @Override
        public int compareTo(ApiVersionCondition other, HttpServletRequest request) {
            // 版本号大的优先匹配
            return Integer.compare(other.version, this.version);
        }

        public int getVersion() {
            return version;
        }
    }

    /**
     * 自定义RequestMappingHandlerMapping
     */
    public static class ApiVersionRequestMappingHandlerMapping extends RequestMappingHandlerMapping {

        @Override
        protected RequestCondition<?> getCustomTypeCondition(Class<?> handlerType) {
            ApiVersion annotation = handlerType.getAnnotation(ApiVersion.class);
            return annotation != null ? new ApiVersionCondition(annotation.value()) : null;
        }

        @Override
        protected RequestCondition<?> getCustomMethodCondition(Method method) {
            ApiVersion annotation = method.getAnnotation(ApiVersion.class);
            return annotation != null ? new ApiVersionCondition(annotation.value()) : null;
        }
    }
}
