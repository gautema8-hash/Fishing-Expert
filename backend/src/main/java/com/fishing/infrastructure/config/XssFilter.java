package com.fishing.infrastructure.config;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * XSS防护过滤器
 * 对请求参数进行HTML转义，防止跨站脚本攻击
 *
 * @author 安全组
 */
public class XssFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // 初始化
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        // 添加安全响应头
        resp.setHeader("X-Content-Type-Options", "nosniff");
        resp.setHeader("X-Frame-Options", "SAMEORIGIN");
        resp.setHeader("X-XSS-Protection", "1; mode=block");
        resp.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // 包装请求，对参数进行转义
        XssHttpServletRequestWrapper wrappedRequest = new XssHttpServletRequestWrapper(req);

        chain.doFilter(wrappedRequest, response);
    }

    @Override
    public void destroy() {
        // 销毁
    }
}
