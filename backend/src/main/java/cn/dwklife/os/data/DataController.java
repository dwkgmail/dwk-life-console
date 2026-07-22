package cn.dwklife.os.data;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/data")
public class DataController {
    private final DataService service;
    public DataController(DataService service) { this.service = service; }
    @GetMapping public Map<String, Object> getAll() { return service.loadAll(); }
    @PutMapping public Map<String, Object> replace(@RequestBody Map<String, Object> data) {
        return service.replaceAll(data, false, "保存完整数据");
    }
}
