package com.fishing.infrastructure.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 敏感数据加密工具
 * AES-256-CBC加密，用于敏感字段存储加密
 *
 * @author 安全组
 */
@Slf4j
@Component
public class EncryptionUtil {

    @Value("${fishing.encryption.key:fishing-dragon-king-2024-secret-key!}")
    private String secretKey;

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/CBC/PKCS5Padding";
    private static final String IV = "fishing2024iv000"; // 16字节IV

    /**
     * 加密
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            return plainText;
        }
        try {
            SecretKeySpec keySpec = new SecretKeySpec(getKeyBytes(), ALGORITHM);
            IvParameterSpec ivSpec = new IvParameterSpec(IV.getBytes(StandardCharsets.UTF_8));
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("加密失败: {}", e.getMessage());
            throw new RuntimeException("加密失败", e);
        }
    }

    /**
     * 解密
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) {
            return encryptedText;
        }
        try {
            SecretKeySpec keySpec = new SecretKeySpec(getKeyBytes(), ALGORITHM);
            IvParameterSpec ivSpec = new IvParameterSpec(IV.getBytes(StandardCharsets.UTF_8));
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("解密失败: {}", e.getMessage());
            throw new RuntimeException("解密失败", e);
        }
    }

    /**
     * 脱敏显示（手机号/身份证等）
     */
    public String mask(String text, String type) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        switch (type) {
            case "phone":
                return maskPhone(text);
            case "idcard":
                return maskIdCard(text);
            case "name":
                return maskName(text);
            case "email":
                return maskEmail(text);
            default:
                return text;
        }
    }

    /**
     * 手机号脱敏：138****8000
     */
    private String maskPhone(String phone) {
        if (phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * 身份证脱敏：110***********1234
     */
    private String maskIdCard(String idCard) {
        if (idCard.length() < 10) return idCard;
        return idCard.substring(0, 3) + "***********" + idCard.substring(idCard.length() - 4);
    }

    /**
     * 姓名脱敏：张*
     */
    private String maskName(String name) {
        if (name.length() <= 1) return name;
        if (name.length() == 2) return name.charAt(0) + "*";
        StringBuilder sb = new StringBuilder();
        sb.append(name.charAt(0));
        for (int i = 0; i < name.length() - 2; i++) {
            sb.append("*");
        }
        sb.append(name.charAt(name.length() - 1));
        return sb.toString();
    }

    /**
     * 邮箱脱敏：te**@example.com
     */
    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) return email;
        String prefix = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (prefix.length() <= 2) return prefix.charAt(0) + "*" + domain;
        return prefix.substring(0, 2) + "**" + domain;
    }

    /**
     * 获取32字节密钥（AES-256）
     */
    private byte[] getKeyBytes() {
        byte[] keyBytes = new byte[32];
        byte[] original = secretKey.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(original, 0, keyBytes, 0, Math.min(original.length, 32));
        return keyBytes;
    }
}
