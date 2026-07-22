package cn.dwklife.os;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class LifeOsIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;

    @Test void loginUsesBcryptAndProtectsApi() throws Exception {
        String hash = jdbc.queryForObject("SELECT password_hash FROM admin_user WHERE username='admin'", String.class);
        assertThat(hash).startsWith("$2").doesNotContain("test-password");
        mvc.perform(get("/api/data")).andExpect(status().isForbidden());
        loginToken();
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void productionHttpsOriginCanLogin() throws Exception {
        mvc.perform(post("/api/auth/login").header("Origin", "https://124.220.16.97")
                        .contentType("application/json")
                        .content("{\"username\":\"admin\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://124.220.16.97"));
    }

    @Test void healthModulePersistsThroughRestApi() throws Exception {
        String token = loginToken();
        mvc.perform(post("/api/modules/health").header("Authorization", "Bearer " + token).contentType("application/json")
                .content("{\"id\":\"h1\",\"date\":\"2026-07-16\",\"morningWeight\":80.2}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value("h1"));
        mvc.perform(get("/api/modules/health/h1").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.morningWeight").value(80.2));
    }

    @Test void moneyIsStoredAsDecimalAndV2CanImport() throws Exception {
        String token = loginToken();
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("settings", Map.of("monthlyBudget", 6000)); data.put("motor", Map.of("currentMileage", 10));
        for (String key : new String[]{"accounts","transactions","health","fuelLogs","maintenanceLogs","rides","faults","repairs","javaTopics","javaLogs","ideas","todos","weeklyReviews","fixedExpenses","incomePlans","categoryBudgets"}) data.put(key, new java.util.ArrayList<>());
        ((java.util.List<Object>) data.get("accounts")).add(Map.of("id", "cash", "name", "现金", "balance", "12.34"));
        String payload = mapper.writeValueAsString(Map.of("schemaVersion", 2, "scope", "完整", "data", data));
        mvc.perform(post("/api/migrations/v2-json?mode=replace").header("Authorization", "Bearer " + token)
                .contentType("application/json").content(payload)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT balance FROM account_record WHERE id='cash'", java.math.BigDecimal.class))
                .isEqualByComparingTo("12.34");
    }

    @Test void backupAndRestoreWorks() throws Exception {
        String token = loginToken();
        mvc.perform(put("/api/data").header("Authorization", "Bearer " + token).contentType("application/json")
                .content(emptyData())).andExpect(status().isOk());
        String response = mvc.perform(post("/api/backups").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"reason\":\"测试\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(response).get("id").asLong();
        mvc.perform(post("/api/backups/" + id + "/restore").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test void everyBusinessModuleSupportsCrud() throws Exception {
        String token = loginToken();
        String[] modules = {"accounts","transactions","health","fuelLogs","maintenanceLogs","rides","faults","repairs",
                "javaTopics","javaLogs","ideas","todos","weeklyReviews","fixedExpenses","incomePlans","categoryBudgets"};
        for (String module : modules) {
            String id = "test-" + module;
            String row = mapper.writeValueAsString(Map.of("id", id, "name", module, "amount", "10.25", "balance", "20.50", "cost", "3.75", "unitPrice", "7.1250"));
            mvc.perform(post("/api/modules/" + module).header("Authorization", "Bearer " + token)
                    .contentType("application/json").content(row)).andExpect(status().isCreated());
            mvc.perform(get("/api/modules/" + module + "/" + id).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
            mvc.perform(delete("/api/modules/" + module + "/" + id).header("Authorization", "Bearer " + token))
                    .andExpect(status().isNoContent());
        }
    }

    @Test void appleHealthWeightSyncDeduplicatesAndReturnsLatestDailyValue() throws Exception {
        String token = loginToken();
        String uuid = UUID.randomUUID().toString();
        Instant measuredAt = Instant.now().minusSeconds(3600);
        String sample = mapper.writeValueAsString(Map.of(
                "samples", java.util.List.of(Map.of(
                        "uuid", uuid, "type", "body_mass", "value", 78.45, "unit", "kg",
                        "startDate", measuredAt.toString(), "endDate", measuredAt.toString(),
                        "sourceName", "Health", "sourceBundleId", "com.apple.Health"))));

        mvc.perform(post("/api/health/sync").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(sample))
                .andExpect(status().isOk()).andExpect(jsonPath("$.inserted").value(1))
                .andExpect(jsonPath("$.duplicates").value(0));
        mvc.perform(post("/api/health/sync").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(sample))
                .andExpect(status().isOk()).andExpect(jsonPath("$.inserted").value(0))
                .andExpect(jsonPath("$.duplicates").value(1));

        String today = LocalDate.now().toString();
        mvc.perform(get("/api/health/weight/daily?from=" + today + "&to=" + today)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].valueKg").value(78.45))
                .andExpect(jsonPath("$[0].healthKitUuid").value(uuid));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM health_raw_data WHERE healthkit_uuid=?", Integer.class, uuid)).isEqualTo(1);
    }

    @Test void appleHealthSyncRejectsInvalidWeightAndRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/health/sync").contentType("application/json").content("{\"samples\":[]}"))
                .andExpect(status().isForbidden());
        String token = loginToken();
        Instant measuredAt = Instant.now().minusSeconds(60);
        String sample = mapper.writeValueAsString(Map.of("samples", java.util.List.of(Map.of(
                "uuid", UUID.randomUUID().toString(), "type", "body_mass", "value", 5, "unit", "kg",
                "startDate", measuredAt.toString(), "endDate", measuredAt.toString(), "sourceName", "Health"))));
        mvc.perform(post("/api/health/sync").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(sample))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("体重必须在 20–500 kg 之间"));
    }

    private String loginToken() throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"username\":\"admin\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).get("token").asText();
    }

    private String emptyData() throws Exception {
        var root = mapper.createObjectNode(); root.put("schemaVersion", 3);
        root.set("settings", mapper.createObjectNode()); root.set("motor", mapper.createObjectNode());
        for (String key : new String[]{"accounts","transactions","health","fuelLogs","maintenanceLogs","rides","faults","repairs","javaTopics","javaLogs","ideas","todos","weeklyReviews","fixedExpenses","incomePlans","categoryBudgets"}) root.set(key, mapper.createArrayNode());
        return mapper.writeValueAsString(root);
    }
}
