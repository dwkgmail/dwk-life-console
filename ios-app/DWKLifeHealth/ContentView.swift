import SwiftUI

struct ContentView: View {
    @StateObject private var health = HealthKitManager()
    @AppStorage("serverAddress") private var serverAddress = "https://124.220.16.97/life/"
    @AppStorage("username") private var username = "admin"
    @AppStorage("lastSuccessfulSync") private var lastSuccessfulSync = 0.0
    @State private var password = ""
    @State private var isSyncing = false
    @State private var resultMessage = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section("服务器") {
                    TextField("https://example.com/life/", text: $serverAddress)
                        .textInputAutocapitalization(.never).keyboardType(.URL).autocorrectionDisabled()
                    TextField("管理员账号", text: $username).textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("管理员密码（仅本次运行使用）", text: $password)
                }
                Section("同步状态") {
                    LabeledContent("HealthKit", value: health.readMessage)
                    LabeledContent("最近成功同步", value: lastSyncText)
                    if !resultMessage.isEmpty { Text(resultMessage).foregroundStyle(.green) }
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red).textSelection(.enabled) }
                    Button {
                        Task { await synchronize() }
                    } label: {
                        HStack {
                            if health.isLoading || isSyncing { ProgressView() }
                            Text(health.samples.isEmpty ? "授权、读取并立即同步" : "立即同步")
                        }
                    }
                    .disabled(health.isLoading || isSyncing)
                }
                Section("最近 30 天体重（\(health.samples.count) 条）") {
                    if health.samples.isEmpty { Text("点击“立即同步”后读取 Apple 健康中的体重").foregroundStyle(.secondary) }
                    ForEach(health.samples) { sample in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack { Text(sample.valueText).font(.headline); Spacer(); Text(sample.startDate, style: .date) }
                            Text("\(sample.sourceName) · \(sample.startDate.formatted(date: .omitted, time: .shortened))")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("DWK Life Health")
        }
    }

    private var lastSyncText: String {
        lastSuccessfulSync > 0 ? Date(timeIntervalSince1970: lastSuccessfulSync).formatted(date: .abbreviated, time: .standard) : "从未同步"
    }

    @MainActor
    private func synchronize() async {
        errorMessage = nil
        resultMessage = ""
        isSyncing = true
        defer { isSyncing = false }
        do {
            try await health.requestPermissionAndLoad()
            guard !health.samples.isEmpty else { throw SyncError.noSamples }
            let client = try APIClient(serverAddress: serverAddress)
            let response = try await client.sync(username: username, password: password, samples: health.samples)
            guard response.received == health.samples.count,
                  response.inserted + response.duplicates == response.received else { throw SyncError.incompleteResponse }
            lastSuccessfulSync = Date().timeIntervalSince1970
            resultMessage = "服务器已保存 \(response.inserted) 条，已去重 \(response.duplicates) 条"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

enum SyncError: LocalizedError {
    case noSamples, incompleteResponse
    var errorDescription: String? {
        switch self {
        case .noSamples: return "最近 30 天没有可同步的体重数据，请先在 Apple 健康中新增体重并确认读取权限"
        case .incompleteResponse: return "服务器确认数量与上传数量不一致，本地同步时间未更新"
        }
    }
}
