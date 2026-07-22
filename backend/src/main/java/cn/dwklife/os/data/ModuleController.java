package cn.dwklife.os.data;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/modules")
public class ModuleController {
    private final DataRepository repository;
    public ModuleController(DataRepository repository) { this.repository = repository; }

    @GetMapping("/{module}") public List<Map<String, Object>> list(@PathVariable String module) {
        return repository.findAll(resolve(module));
    }
    @GetMapping("/{module}/{id}") public Map<String, Object> get(@PathVariable String module, @PathVariable String id) {
        return repository.findById(resolve(module), id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
    }
    @PostMapping("/{module}") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public Map<String, Object> create(@PathVariable String module, @RequestBody Map<String, Object> row) {
        return repository.save(resolve(module), row);
    }
    @PutMapping("/{module}/{id}") @Transactional
    public Map<String, Object> update(@PathVariable String module, @PathVariable String id, @RequestBody Map<String, Object> row) {
        row.put("id", id); return repository.save(resolve(module), row);
    }
    @DeleteMapping("/{module}/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void delete(@PathVariable String module, @PathVariable String id) {
        if (!repository.delete(resolve(module), id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在");
    }
    private ModuleDefinition resolve(String name) {
        try { return ModuleDefinition.fromApiName(name); }
        catch (IllegalArgumentException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage()); }
    }
}
