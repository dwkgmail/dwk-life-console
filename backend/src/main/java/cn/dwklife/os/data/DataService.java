package cn.dwklife.os.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@Service
public class DataService {
    private static final Set<String> REQUIRED_V2 = Set.of("settings", "accounts", "transactions", "health", "motor", "javaTopics", "ideas", "todos");
    private final DataRepository repository;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public DataService(DataRepository repository, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.repository = repository; this.jdbc = jdbc; this.mapper = mapper;
    }

    public Map<String, Object> loadAll() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("schemaVersion", 3);
        data.put("initialized", repository.initialized());
        data.put("settings", repository.loadConfig("settings"));
        data.put("motor", repository.loadConfig("motor"));
        for (ModuleDefinition module : ModuleDefinition.values()) data.put(module.apiName(), repository.findAll(module));
        return data;
    }

    @Transactional
    public Map<String, Object> replaceAll(Map<String, Object> data, boolean backup, String reason) {
        if (backup && repository.initialized()) createBackup(reason);
        for (ModuleDefinition module : ModuleDefinition.values()) {
            repository.clear(module);
            for (Map<String, Object> row : rows(data.get(module.apiName()))) repository.save(module, row);
        }
        repository.saveConfig("settings", objectMap(data.get("settings")));
        repository.saveConfig("motor", objectMap(data.get("motor")));
        return loadAll();
    }

    @Transactional
    public Map<String, Object> mergeAll(Map<String, Object> incoming) {
        createBackup("JSON 导入前自动备份");
        for (ModuleDefinition module : ModuleDefinition.values()) {
            for (Map<String, Object> row : rows(incoming.get(module.apiName()))) repository.save(module, row);
        }
        if (incoming.containsKey("settings")) {
            Map<String, Object> merged = repository.loadConfig("settings"); merged.putAll(objectMap(incoming.get("settings"))); repository.saveConfig("settings", merged);
        }
        if (incoming.containsKey("motor")) {
            Map<String, Object> merged = repository.loadConfig("motor"); merged.putAll(objectMap(incoming.get("motor"))); repository.saveConfig("motor", merged);
        }
        return loadAll();
    }

    @Transactional
    public Map<String, Object> importV2(Map<String, Object> payload, String mode) {
        int version = number(payload.getOrDefault("schemaVersion", payload.getOrDefault("version", 0)));
        if (version != 2) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "仅支持第二版 schemaVersion=2 的 JSON");
        Map<String, Object> data = objectMap(payload.getOrDefault("data", payload));
        if (!data.keySet().containsAll(REQUIRED_V2)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "第二版完整备份缺少必要模块");
        int count = Arrays.stream(ModuleDefinition.values()).mapToInt(m -> rows(data.get(m.apiName())).size()).sum();
        Map<String, Object> result = "merge".equalsIgnoreCase(mode) ? mergeAll(data) : replaceAll(data, true, "JSON 导入前自动备份");
        jdbc.update("INSERT INTO migration_log(source_version,import_mode,record_count) VALUES (2,?,?)", mode, count);
        return result;
    }

    @Transactional
    public long createBackup(String reason) {
        Map<String, Object> export = new LinkedHashMap<>();
        export.put("app", "DWK Life OS"); export.put("schemaVersion", 3); export.put("exportedAt", Instant.now().toString()); export.put("scope", "完整"); export.put("data", loadAll());
        jdbc.update("INSERT INTO backup_snapshot(reason,payload) VALUES (?,?)", reason, repository.write(export));
        return Objects.requireNonNull(jdbc.queryForObject("SELECT MAX(id) FROM backup_snapshot", Long.class));
    }

    public List<Map<String, Object>> listBackups() {
        return jdbc.query("SELECT id,reason,created_at FROM backup_snapshot ORDER BY id DESC",
                (rs, row) -> Map.of("id", rs.getLong(1), "reason", rs.getString(2), "createdAt", rs.getTimestamp(3).toInstant().toString()));
    }

    public Map<String, Object> exportCurrent() {
        return Map.of("app", "DWK Life OS", "schemaVersion", 3, "exportedAt", Instant.now().toString(), "scope", "完整", "data", loadAll());
    }

    @Transactional
    public Map<String, Object> restore(long id) {
        String json = jdbc.query("SELECT payload FROM backup_snapshot WHERE id=?", (rs, row) -> rs.getString(1), id)
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "备份不存在"));
        try {
            Map<String, Object> wrapper = mapper.readValue(json, new TypeReference<>() {});
            return replaceAll(objectMap(wrapper.get("data")), true, "恢复备份前自动备份");
        } catch (Exception ex) { throw new IllegalStateException("备份内容损坏", ex); }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rows(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        return list.stream().filter(Map.class::isInstance).map(v -> (Map<String, Object>) v).toList();
    }
    @SuppressWarnings("unchecked") private Map<String, Object> objectMap(Object value) {
        return value instanceof Map<?, ?> map ? new LinkedHashMap<>((Map<String, Object>) map) : new LinkedHashMap<>();
    }
    private int number(Object value) { try { return Integer.parseInt(String.valueOf(value)); } catch (Exception ex) { return 0; } }
}
