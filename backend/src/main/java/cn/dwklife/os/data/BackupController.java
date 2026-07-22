package cn.dwklife.os.data;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backups")
public class BackupController {
    private final DataService service;
    public BackupController(DataService service) { this.service = service; }
    @GetMapping public List<Map<String, Object>> list() { return service.listBackups(); }
    @PostMapping public Map<String, Long> create(@RequestBody(required = false) Map<String, String> request) {
        String reason = request == null ? "手动备份" : request.getOrDefault("reason", "手动备份");
        return Map.of("id", service.createBackup(reason));
    }
    @PostMapping("/{id}/restore") public Map<String, Object> restore(@PathVariable long id) { return service.restore(id); }
    @GetMapping("/export") public Map<String, Object> export() { return service.exportCurrent(); }
}
