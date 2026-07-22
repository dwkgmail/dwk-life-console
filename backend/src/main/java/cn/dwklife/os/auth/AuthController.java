package cn.dwklife.os.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final TokenService tokens;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder, TokenService tokens) {
        this.jdbc = jdbc; this.encoder = encoder; this.tokens = tokens;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        var hashes = jdbc.query("SELECT password_hash FROM admin_user WHERE username=?",
                (rs, row) -> rs.getString(1), request.username());
        if (hashes.isEmpty() || !encoder.matches(request.password(), hashes.get(0))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        }
        return Map.of("token", tokens.create(request.username()), "username", request.username(), "expiresInHours", 12);
    }

    @GetMapping("/me") public Map<String, String> me(Authentication authentication) {
        return Map.of("username", authentication.getName());
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
}
