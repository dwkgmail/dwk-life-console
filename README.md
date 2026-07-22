# DWK Life OS 3.0

DWK Life OS 3.0 是从第二版增量升级的个人生活控制台。前端继续使用原有 HTML、CSS、JavaScript、Chart.js、PWA 和手机布局；业务数据通过 REST API 保存到 Java 17 / Spring Boot / MySQL 后端。第二版源码和数据处理逻辑完整保存在 `v2/`，没有删除。

## 一键启动

推荐先复制环境变量模板并修改所有密码：

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

访问地址：

- 应用：http://localhost:3000
- Swagger：http://localhost:3000/swagger-ui.html
- 默认账号：`admin`
- 默认密码：`admin123456`

正式使用前必须在 `.env` 中修改管理员密码、数据库密码和 `TOKEN_SECRET`。已有 MySQL 数据卷不会因修改 `ADMIN_PASSWORD` 自动覆盖现有管理员密码。

常用命令：

```powershell
docker compose ps
docker compose logs -f backend
docker compose down
docker compose down -v  # 会删除 3.0 MySQL 数据，仅在明确需要重置时使用
```

## 当前公网部署

- 地址：`https://124.220.16.97/life/`
- 服务器目录：`/opt/dwk-life-os`
- 容器前端只绑定 `127.0.0.1:3001`，由宿主机 Nginx 提供公网 HTTPS。
- MySQL 和 Spring Boot 端口不对公网开放。
- HTTPS 使用 Let’s Encrypt 短期 IP 证书，Snap Certbot 定时续期并在续期后检查、热加载 Nginx。
- `dingwenkai.online` 当前受腾讯云域名备案拦截，完成备案后可再切换到域名访问。

## 本地开发

后端要求 Java 17 兼容级别，当前 Maven 配置使用 `release 17`：

```powershell
mvn -f backend/pom.xml test
mvn -f backend/pom.xml spring-boot:run
```

前端测试和构建：

```powershell
npm install
npm test
npm run build
```

## 数据库表

Flyway 迁移文件位于 `backend/src/main/resources/db/migration`。

| 表 | 用途 |
|---|---|
| `admin_user` | 管理员账号与 BCrypt 密码哈希 |
| `app_config` | 基础设置、摩托车当前状态 |
| `health_record` | 健康、体重、睡眠、饮水、运动、CPAP |
| `account_record` | 财务账户，`balance DECIMAL(19,2)` |
| `financial_transaction` | 收支流水，`amount DECIMAL(19,2)` |
| `fixed_expense` / `income_plan` / `category_budget` | 固定支出、收入计划、分类预算，金额均为 `DECIMAL(19,2)` |
| `fuel_log` | 加油金额与单价，分别为 `DECIMAL(19,2)`、`DECIMAL(19,4)` |
| `maintenance_log` / `fault_record` / `repair_record` | 保养、故障、维修及精确费用 |
| `ride_record` | 骑行记录 |
| `java_topic` / `java_learning_log` | Java 路线与学习日志 |
| `idea_record` | 点子评分和看板状态 |
| `todo_record` | 待办、耗时、重复和延期信息 |
| `weekly_review` | 周复盘文本与日期范围 |
| `backup_snapshot` | 服务端完整 JSON 备份 |
| `migration_log` | V2 JSON 导入审计 |
| `flyway_schema_history` | Flyway 迁移历史 |

业务表同时保存完整 JSON 载荷以兼容 V2 字段；所有金额另外写入 DECIMAL 列，Java 端通过 `BigDecimal` 读写，避免浮点金额误差。

## API 清单

除登录和 Swagger 外均需 `Authorization: Bearer <token>`。

| 方法 | 地址 | 说明 |
|---|---|---|
| `POST` | `/api/auth/login` | 管理员登录 |
| `GET` | `/api/auth/me` | 当前登录用户 |
| `GET` / `PUT` | `/api/data` | 获取或保存完整聚合数据 |
| `GET` / `POST` | `/api/modules/{module}` | 模块列表、新增记录 |
| `GET` / `PUT` / `DELETE` | `/api/modules/{module}/{id}` | 单条查询、修改、删除 |
| `GET` / `POST` | `/api/backups` | 备份列表、创建备份 |
| `POST` | `/api/backups/{id}/restore` | 恢复指定备份；恢复前再备份当前数据 |
| `GET` | `/api/backups/export` | 导出当前完整数据 |
| `POST` | `/api/migrations/v2-json?mode=replace|merge` | 导入第二版 JSON |

`module` 支持：`accounts`、`transactions`、`health`、`fuelLogs`、`maintenanceLogs`、`rides`、`faults`、`repairs`、`javaTopics`、`javaLogs`、`ideas`、`todos`、`weeklyReviews`、`fixedExpenses`、`incomePlans`、`categoryBudgets`。

## 第二版 JSON 数据迁移

1. 在第二版“隐私与数据”页面导出完整 JSON，确认文件包含 `schemaVersion: 2`。
2. 启动 3.0 并登录。
3. 点击顶部“导入”，选择 JSON 文件。
4. 选择“合并”或“完整替换”。同 ID 在合并模式下会由导入记录覆盖。
5. 后端会在导入前创建 `backup_snapshot`，成功后写入 `migration_log`。

也可直接调用：

```text
POST /api/migrations/v2-json?mode=replace
Content-Type: application/json
Authorization: Bearer <token>
```

`v2/` 目录和原浏览器 IndexedDB/localStorage 数据不会被迁移过程删除。

## 备份与恢复

- 顶部“完整备份”会先在 MySQL 创建快照，再下载 V2 兼容 JSON。
- “隐私与数据”页面列出 MySQL 快照，可一键恢复。
- 恢复前自动再备份当前数据，降低误操作风险。
- Docker 的 `mysql_data` 卷提供容器重启后的数据库持久化；JSON 导出用于离线和跨机器恢复。

## 测试结果

- 前端/V2 回归：14 项通过，覆盖 IndexedDB 保留、计算规则、图表/PWA/移动端、登录与 REST 接入。
- 后端 JUnit：登录与 BCrypt、未授权拦截、全部 16 类集合 CRUD、BigDecimal/DECIMAL、V2 导入、备份恢复。
- Docker 冒烟：前端 HTTP 200、管理员登录、健康记录写入/读取/删除、MySQL/Flyway 表检查均通过。

运行完整验证：

```powershell
npm test
mvn -f backend/pom.xml test
docker compose up -d --build
```

## 已知问题

- 当前只有单管理员账号，不含多用户、角色和找回密码流程。
- 登录令牌保存在浏览器 `sessionStorage`，关闭标签页后需重新登录；令牌默认 12 小时过期。
- 密码库模块仍沿用 V2 的浏览器端 AES-GCM 加密存储，没有上传到 MySQL。
- PWA 只缓存静态资源，REST 数据不会离线缓存；后端或 MySQL离线时只能查看浏览器已渲染内容，不能保存。
- 第一次 Docker 构建需要下载 Maven 和容器依赖，网络较慢时耗时较长，后续会使用构建缓存。

## Apple Health 体重同步（第一期）

### 后端与 MySQL

`health_raw_data` 由 Flyway 的 `V2__apple_health_weight.sql` 自动创建。已有数据库只需启动新版后端，Flyway 会增量执行；全新本地环境可运行：

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose logs -f backend
```

如只启动 MySQL 和本机后端：

```powershell
docker compose up -d mysql
mvn -f backend/pom.xml spring-boot:run
```

接口均需先调用 `/api/auth/login` 获取 Bearer Token：

- `POST /api/health/sync`：上传最近 30 天体重，使用 HealthKit UUID 唯一约束去重。
- `GET /api/health/weight/daily?from=2026-07-01&to=2026-07-31`：按天返回当天最后一条体重；默认最近 30 天。

测试数据示例（把 `$token` 替换为登录接口返回值）：

```powershell
$body = @{ samples = @(@{
  uuid = [guid]::NewGuid().ToString(); type = 'body_mass'; value = 78.45; unit = 'kg'
  startDate = (Get-Date).ToUniversalTime().ToString('o'); endDate = (Get-Date).ToUniversalTime().ToString('o')
  sourceName = 'Health'; sourceBundleId = 'com.apple.Health'
}) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/health/sync' -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri 'http://localhost:3000/api/health/weight/daily' -Headers @{Authorization="Bearer $token"}
```

### Xcode 配置与真机测试

1. 在 macOS 的 Xcode 16 或更新版本打开 `ios-app/DWKLifeHealth.xcodeproj`。
2. 选择 `DWKLifeHealth` Target，在 Signing & Capabilities 中选择自己的 Team，并把 Bundle Identifier 改成该团队下唯一值。
3. 确认 HealthKit Capability 已存在；工程已包含只读说明 `NSHealthShareUsageDescription` 和 HealthKit entitlement，不要添加体重写权限。
4. 连接 iOS 17 或更新版本的 iPhone，选择真机运行。HealthKit 无法用普通模拟器完成真实数据验证。
5. 在 iPhone“健康 > 浏览 > 身体测量 > 体重 > 添加数据”新增一条体重。
6. 打开 App，填写公网 HTTPS 地址、管理员账号和密码，点击“授权、读取并立即同步”，在系统权限页允许读取体重。
7. App 显示“服务器已保存”后打开网页健康模块；网页会自动读取，也可点击“刷新 Apple Health”。列表中来源应显示 Apple Health。

App 只在后端返回成功且确认数量完整后更新“最近成功同步”。账号和服务器地址保存在 `UserDefaults`，密码仅保留在本次 App 运行内存中。

当前限制：仅支持体重、手动前台同步和单管理员账号；只查询/上传最近 30 天；每日展示以 Asia/Shanghai 时区当天最后一条样本为准；尚无后台同步、步数、睡眠、Keychain 密码保存和多用户数据隔离。
