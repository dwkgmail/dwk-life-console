package cn.dwklife.os.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
public class TokenService {
    private final byte[] secret;
    private final long ttlSeconds;

    public TokenService(@Value("${app.token.secret}") String secret,
                        @Value("${app.token.ttl-hours:12}") long ttlHours) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlHours * 3600;
    }

    public String create(String username) {
        String payload = username + "|" + Instant.now().plusSeconds(ttlSeconds).getEpochSecond();
        String body = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return body + "." + sign(body);
    }

    public Optional<String> verify(String token) {
        try {
            String[] parts = token.split("\\.", 2);
            if (parts.length != 2 || !constantTimeEquals(parts[1], sign(parts[0]))) return Optional.empty();
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            int separator = payload.lastIndexOf('|');
            if (separator < 1) return Optional.empty();
            long expiresAt = Long.parseLong(payload.substring(separator + 1));
            return expiresAt > Instant.now().getEpochSecond()
                    ? Optional.of(payload.substring(0, separator)) : Optional.empty();
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    private String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("无法生成登录令牌", ex);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return java.security.MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }
}
