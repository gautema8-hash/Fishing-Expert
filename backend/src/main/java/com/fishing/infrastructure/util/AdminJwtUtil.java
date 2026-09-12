package com.fishing.infrastructure.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理员JWT工具类
 * 与玩家JwtUtil独立，使用同一secret但增加token类型前缀区分
 *
 * @author 后端架构组
 */
@Slf4j
@Component
public class AdminJwtUtil {

    /**
     * 管理员令牌类型标识，用于与玩家令牌区分
     */
    private static final String TOKEN_TYPE = "admin";

    @Value("${game.jwt.secret}")
    private String secret;

    @Value("${game.jwt.expiration}")
    private Long expiration;

    /**
     * 生成管理员Token
     *
     * @param adminId  管理员ID
     * @param username 管理员用户名
     * @param role     角色
     * @return JWT Token
     */
    public String generateToken(Long adminId, String username, String role) {
        Map<String, Object> claims = new HashMap<>(8);
        claims.put("adminId", adminId);
        claims.put("username", username);
        claims.put("role", role);
        claims.put("tokenType", TOKEN_TYPE);
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(String.valueOf(adminId))
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
    }

    /**
     * 验证Token
     *
     * @param token JWT Token
     * @return 是否有效
     */
    public boolean validateToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return TOKEN_TYPE.equals(claims.get("tokenType", String.class)) && !isTokenExpired(claims);
        } catch (Exception e) {
            log.error("管理员Token验证失败", e);
            return false;
        }
    }

    /**
     * 从Token中获取管理员ID
     */
    public Long getAdminIdFromToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return claims.get("adminId", Long.class);
        } catch (Exception e) {
            log.error("解析管理员Token获取ID失败", e);
            return null;
        }
    }

    /**
     * 从Token中获取用户名
     */
    public String getUsernameFromToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return claims.get("username", String.class);
        } catch (Exception e) {
            log.error("解析管理员Token获取用户名失败", e);
            return null;
        }
    }

    /**
     * 从Token中获取角色
     */
    public String getRoleFromToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return claims.get("role", String.class);
        } catch (Exception e) {
            log.error("解析管理员Token获取角色失败", e);
            return null;
        }
    }

    /**
     * 获取Claims
     */
    private Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .setSigningKey(secret)
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * 判断Token是否过期
     */
    private boolean isTokenExpired(Claims claims) {
        Date expiration = claims.getExpiration();
        return expiration.before(new Date());
    }
}
