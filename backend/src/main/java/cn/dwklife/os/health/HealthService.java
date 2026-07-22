package cn.dwklife.os.health;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class HealthService {
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Shanghai");
    private final JdbcTemplate jdbc;

    public HealthService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public SyncResult sync(HealthSyncRequest request) {
        int inserted = 0;
        int duplicates = 0;
        for (HealthSyncRequest.Sample sample : request.samples()) {
            validate(sample);
            try {
                jdbc.update("""
                        INSERT INTO health_raw_data
                          (healthkit_uuid, data_type, value_decimal, unit, start_time, end_time,
                           source_name, source_bundle_id, device_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        sample.uuid().toString(), sample.type().name(), sample.value(), sample.unit().name(),
                        Timestamp.from(sample.startDate()), Timestamp.from(sample.endDate()), sample.sourceName().trim(),
                        blankToNull(sample.sourceBundleId()), blankToNull(sample.deviceName()));
                inserted++;
            } catch (DuplicateKeyException ex) {
                duplicates++;
            }
        }
        return new SyncResult(inserted, duplicates, request.samples().size(), Instant.now());
    }

    public List<DailyWeight> dailyWeights(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) throw new IllegalArgumentException("from 不能晚于 to");
        if (ChronoUnit.DAYS.between(from, to) > 366) throw new IllegalArgumentException("查询范围不能超过 366 天");
        Instant start = from.atStartOfDay(DISPLAY_ZONE).toInstant();
        Instant end = to.plusDays(1).atStartOfDay(DISPLAY_ZONE).toInstant();
        List<RawWeight> rows = jdbc.query("""
                        SELECT healthkit_uuid, value_decimal, start_time, source_name
                        FROM health_raw_data
                        WHERE data_type='body_mass' AND start_time>=? AND start_time<?
                        ORDER BY start_time DESC, id DESC
                        """,
                (rs, row) -> new RawWeight(rs.getString("healthkit_uuid"), rs.getBigDecimal("value_decimal"),
                        rs.getTimestamp("start_time").toInstant(), rs.getString("source_name")),
                Timestamp.from(start), Timestamp.from(end));
        LinkedHashMap<LocalDate, DailyWeight> latestByDay = new LinkedHashMap<>();
        for (RawWeight row : rows) {
            LocalDate date = row.measuredAt().atZone(DISPLAY_ZONE).toLocalDate();
            latestByDay.putIfAbsent(date, new DailyWeight(date, row.valueKg(), row.measuredAt(), row.sourceName(), row.uuid()));
        }
        return List.copyOf(latestByDay.values());
    }

    private void validate(HealthSyncRequest.Sample sample) {
        if (sample.value().compareTo(new BigDecimal("20")) < 0 || sample.value().compareTo(new BigDecimal("500")) > 0)
            throw new IllegalArgumentException("体重必须在 20–500 kg 之间");
        if (sample.startDate().isAfter(sample.endDate())) throw new IllegalArgumentException("startDate 不能晚于 endDate");
        if (sample.endDate().isAfter(Instant.now().plus(Duration.ofMinutes(5)))) throw new IllegalArgumentException("体重时间不能晚于当前时间");
        if (sample.startDate().isBefore(Instant.now().minus(Duration.ofDays(31)))) throw new IllegalArgumentException("只接受最近 30 天的体重数据");
        if (sample.sourceName().isBlank()) throw new IllegalArgumentException("sourceName 不能为空");
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private record RawWeight(String uuid, BigDecimal valueKg, Instant measuredAt, String sourceName) {}
    public record SyncResult(int inserted, int duplicates, int received, Instant savedAt) {}
    public record DailyWeight(LocalDate date, BigDecimal valueKg, Instant measuredAt, String sourceName, String healthKitUuid) {}
}
