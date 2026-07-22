package cn.dwklife.os.data;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

public enum ModuleDefinition {
    ACCOUNTS("accounts", "account_record", Map.of("balance", "balance")),
    TRANSACTIONS("transactions", "financial_transaction", Map.of("amount", "amount")),
    HEALTH("health", "health_record", Map.of()),
    FUEL_LOGS("fuelLogs", "fuel_log", Map.of("amount", "amount", "unitPrice", "unit_price")),
    MAINTENANCE_LOGS("maintenanceLogs", "maintenance_log", Map.of("cost", "cost")),
    RIDES("rides", "ride_record", Map.of()),
    FAULTS("faults", "fault_record", Map.of("cost", "cost")),
    REPAIRS("repairs", "repair_record", Map.of("cost", "cost")),
    JAVA_TOPICS("javaTopics", "java_topic", Map.of()),
    JAVA_LOGS("javaLogs", "java_learning_log", Map.of()),
    IDEAS("ideas", "idea_record", Map.of()),
    TODOS("todos", "todo_record", Map.of()),
    WEEKLY_REVIEWS("weeklyReviews", "weekly_review", Map.of()),
    FIXED_EXPENSES("fixedExpenses", "fixed_expense", Map.of("amount", "amount")),
    INCOME_PLANS("incomePlans", "income_plan", Map.of("amount", "amount")),
    CATEGORY_BUDGETS("categoryBudgets", "category_budget", Map.of("amount", "amount"));

    private final String apiName;
    private final String table;
    private final Map<String, String> moneyColumns;

    ModuleDefinition(String apiName, String table, Map<String, String> moneyColumns) {
        this.apiName = apiName; this.table = table; this.moneyColumns = new LinkedHashMap<>(moneyColumns);
    }
    public String apiName() { return apiName; }
    public String table() { return table; }
    public Map<String, String> moneyColumns() { return moneyColumns; }
    public static ModuleDefinition fromApiName(String name) {
        return Arrays.stream(values()).filter(v -> v.apiName.equals(name)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("未知模块: " + name));
    }
}
