package cn.dwklife.os.data;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/migrations")
public class MigrationController {
    private final DataService service;
    public MigrationController(DataService service) { this.service = service; }
    @PostMapping("/v2-json") public Map<String, Object> importV2(@RequestParam(defaultValue = "replace") String mode,
                                                                 @RequestBody Map<String, Object> payload) {
        return service.importV2(payload, mode);
    }
}
