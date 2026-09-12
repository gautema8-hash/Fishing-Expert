package com.fishing.infrastructure.config;

import com.fishing.common.context.AdminContext;
import com.fishing.infrastructure.util.AdminJwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * 管理员JWT认证拦截器
 *
 * @author 后端架构组
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminJwtInterceptor implements HandlerInterceptor {

    private final AdminJwtUtil adminJwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 放行OPTIONS预检请求
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        if (token == null || token.isEmpty()) {
            writeUnauthorized(response, "未授权或登录已过期");
            return false;
        }

        if (!adminJwtUtil.validateToken(token)) {
            writeUnauthorized(response, "Token无效或已过期");
            return false;
        }

        Long adminId = adminJwtUtil.getAdminIdFromToken(token);
        String username = adminJwtUtil.getUsernameFromToken(token);
        String role = adminJwtUtil.getRoleFromToken(token);

        if (adminId == null) {
            writeUnauthorized(response, "Token解析失败");
            return false;
        }

        AdminContext.setCurrentAdmin(new AdminContext.AdminInfo(adminId, username, role));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AdminContext.clear();
    }

    /**
     * 输出401 JSON响应
     */
    private void writeUnauthorized(HttpServletResponse response, String message) throws Exception {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":401,\"message\":\"" + message + "\"}");
    }
}
