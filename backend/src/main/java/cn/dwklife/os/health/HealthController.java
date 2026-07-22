package cn.dwklife.os.health;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final HealthService service;

    public HealthController(HealthService service) { this.service = service; }

    @PostMapping("/sync")
    public HealthService.SyncResult sync(@Valid @RequestBody HealthSyncRequest request) {
        return service.sync(request);
    }

    @GetMapping("/weight/daily")
    public List<HealthService.DailyWeight> daily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate effectiveTo = to == null ? LocalDate.now() : to;
        LocalDate effectiveFrom = from == null ? effectiveTo.minusDays(29) : from;
        return service.dailyWeights(effectiveFrom, effectiveTo);
    }
}
