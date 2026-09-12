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
 * JWT工具类
 *
 * @author 后端架构组
 */
@Slf4j
@Component
public class JwtUtil {

    @Value("${game.jwt.secret}")
    private String secret;

    @Value("${game.jwt.expiration}")
    private Long expiration;

    /**
     * 生成Token
     *
     * @param playerId 玩家ID
     * @return JWT Token
     */
    public String generateToken(String playerId) {
        Map<String, Object> claims = new HashMap<>(4);
        claims.put("playerId", playerId);
        return createToken(claims, playerId);
    }

    /**
     * 创建Token
     */
    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
    }

    /**
     * 从Token中获取玩家ID
     *
     * @param token JWT Token
     * @return 玩家ID
     */
    public String getPlayerIdFromToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return claims.get("playerId", String.class);
        } catch (Exception e) {
            log.error("解析Token失败", e);
            return null;
        }
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
            return !isTokenExpired(claims);
        } catch (Exception e) {
            log.error("验证Token失败", e);
            return false;
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
