package cn.dwklife.os.health;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record HealthSyncRequest(@NotEmpty @Size(max = 1000) List<@Valid Sample> samples) {
    public record Sample(
            @NotNull java.util.UUID uuid,
            @NotNull DataType type,
            @NotNull BigDecimal value,
            @NotNull Unit unit,
            @NotNull Instant startDate,
            @NotNull Instant endDate,
            @NotNull @Size(max = 128) String sourceName,
            @Size(max = 255) String sourceBundleId,
            @Size(max = 128) String deviceName
    ) {}

    public enum DataType { body_mass }
    public enum Unit { kg }
}
