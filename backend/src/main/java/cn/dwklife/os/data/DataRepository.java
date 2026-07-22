package cn.dwklife.os.data;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@Repository
public class DataRepository {
    private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public DataRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) { this.jdbc = jdbc; this.objectMapper = objectMapper; }

    public List<Map<String, Object>> findAll(ModuleDefinition module) {
        String moneySelect = module.moneyColumns().values().stream().map(c -> ", " + c).reduce("", String::concat);
        return jdbc.query("SELECT payload" + moneySelect + " FROM " + module.table() + " ORDER BY id",
                (rs, rowNum) -> readPayload(module, rs));
    }

    public Optional<Map<String, Object>> findById(ModuleDefinition module, String id) {
        String moneySelect = module.moneyColumns().values().stream().map(c -> ", " + c).reduce("", String::concat);
        return jdbc.query("SELECT payload" + moneySelect + " FROM " + module.table() + " WHERE id=?",
                (rs, rowNum) -> readPayload(module, rs), id).stream().findFirst();
    }

    public Map<String, Object> save(ModuleDefinition module, Map<String, Object> source) {
        Map<String, Object> row = new LinkedHashMap<>(source);
        String id = Objects.toString(row.getOrDefault("id", UUID.randomUUID().toString()));
        row.put("id", id);
        jdbc.update("DELETE FROM " + module.table() + " WHERE id=?", id);
        List<String> columns = new ArrayList<>(List.of("id"));
        List<Object> values = new ArrayList<>(List.of(id));
        module.moneyColumns().forEach((field, column) -> {
            columns.add(column); values.add(decimal(row.get(field)));
        });
        columns.add("payload"); values.add(write(row));
        String placeholders = String.join(",", Collections.nCopies(values.size(), "?"));
        jdbc.update("INSERT INTO " + module.table() + "(" + String.join(",", columns) + ") VALUES (" + placeholders + ")", values.toArray());
        return row;
    }

    public boolean delete(ModuleDefinition module, String id) {
        return jdbc.update("DELETE FROM " + module.table() + " WHERE id=?", id) > 0;
    }

    public void clear(ModuleDefinition module) { jdbc.update("DELETE FROM " + module.table()); }

    public Map<String, Object> loadConfig(String key) {
        return jdbc.query("SELECT payload FROM app_config WHERE config_key=?", (rs, row) -> read(rs.getString(1)), key)
                .stream().findFirst().orElseGet(LinkedHashMap::new);
    }

    public void saveConfig(String key, Object value) {
        jdbc.update("DELETE FROM app_config WHERE config_key=?", key);
        jdbc.update("INSERT INTO app_config(config_key,payload) VALUES (?,?)", key, write(value));
    }

    public boolean initialized() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM app_config WHERE config_key='settings'", Integer.class);
        return count != null && count > 0;
    }

    private Map<String, Object> readPayload(ModuleDefinition module, ResultSet rs) throws SQLException {
        Map<String, Object> payload = read(rs.getString("payload"));
        module.moneyColumns().forEach((field, column) -> {
            try { payload.put(field, rs.getBigDecimal(column)); } catch (SQLException ex) { throw new IllegalStateException(ex); }
        });
        return payload;
    }

    private Map<String, Object> read(String value) {
        try { return objectMapper.readValue(value, MAP_TYPE); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("数据库 JSON 数据损坏", ex); }
    }

    public String write(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException ex) { throw new IllegalArgumentException("数据无法序列化", ex); }
    }

    private BigDecimal decimal(Object value) {
        if (value == null || value.toString().isBlank()) return BigDecimal.ZERO;
        try { return new BigDecimal(value.toString()); }
        catch (NumberFormatException ex) { throw new IllegalArgumentException("金额格式不正确: " + value); }
    }
}
