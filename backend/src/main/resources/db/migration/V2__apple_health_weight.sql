CREATE TABLE health_raw_data (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  healthkit_uuid VARCHAR(36) NOT NULL,
  data_type VARCHAR(32) NOT NULL,
  value_decimal DECIMAL(10,3) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  start_time TIMESTAMP(6) NOT NULL,
  end_time TIMESTAMP(6) NOT NULL,
  source_name VARCHAR(128) NOT NULL,
  source_bundle_id VARCHAR(255),
  device_name VARCHAR(128),
  synced_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uk_health_raw_healthkit_uuid UNIQUE (healthkit_uuid),
  INDEX idx_health_raw_type_start (data_type, start_time)
);
