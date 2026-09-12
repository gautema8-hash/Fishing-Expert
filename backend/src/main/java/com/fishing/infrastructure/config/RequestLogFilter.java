package com.fishing.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 全局请求日志过滤器
 * 记录所有API请求的方法、路径、参数、响应状态、耗时
 *
 * @author 后端架构组
 */
@Slf4j
@Component
@Order(2)
public class RequestLogFilter implements Filter {

    private static final int MAX_BODY_LENGTH = 1000;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 包装请求和响应以缓存内容
        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(httpRequest);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(httpResponse);

        long startTime = System.currentTimeMillis();
        String method = httpRequest.getMethod();
        String uri = httpRequest.getRequestURI();
        String queryString = httpRequest.getQueryString();
        String clientIp = getClientIp(httpRequest);

        try {
            chain.doFilter(wrappedRequest, wrappedResponse);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = wrappedResponse.getStatus();

            // 构建日志信息
            StringBuilder logMsg = new StringBuilder();
            logMsg.append("[").append(method).append("] ")
                   .append(uri);
            if (queryString != null) {
                logMsg.append("?").append(queryString);
            }
            logMsg.append(" - ").append(status)
                   .append(" - ").append(duration).append("ms")
                   .append(" - IP:").append(clientIp);

            // 记录请求体（POST/PUT）
            if ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)) {
                byte[] requestBody = wrappedRequest.getContentAsByteArray();
                if (requestBody.length > 0) {
                    String body = new String(requestBody, StandardCharsets.UTF_8);
                    if (body.length() > MAX_BODY_LENGTH) {
                        body = body.substring(0, MAX_BODY_LENGTH) + "...";
                    }
                    // 脱敏：不记录密码
                    body = body.replaceAll("\"password\"\\s*:\\s*\"[^\"]*\"", "\"password\":\"***\"");
                    logMsg.append(" - Body:").append(body);
                }
            }

            // 慢请求警告
            if (duration > 1000) {
                log.warn("慢请求: {}", logMsg);
            } else if (status >= 400) {
                log.error("请求异常: {}", logMsg);
            } else {
                log.info("请求: {}", logMsg);
            }

            // 必须复制响应内容回原始响应
            wrappedResponse.copyBodyToResponse();
        }
    }

    /**
     * 获取客户端真实IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多级代理时取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
