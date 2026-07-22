import Foundation
import HealthKit

@MainActor
final class HealthKitManager: ObservableObject {
    @Published private(set) var samples: [WeightSample] = []
    @Published private(set) var isLoading = false
    @Published private(set) var readMessage = "尚未读取 Apple 健康"

    private let store = HKHealthStore()

    func requestPermissionAndLoad() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthError.unavailable
        }
        guard let bodyMass = HKObjectType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthError.typeUnavailable
        }
        isLoading = true
        defer { isLoading = false }

        try await requestAuthorization(bodyMass)
        let loaded = try await query(bodyMass)
        samples = loaded
        readMessage = loaded.isEmpty ? "最近 30 天没有可读取的体重数据" : "已读取最近 30 天的 \(loaded.count) 条体重"
    }

    private func requestAuthorization(_ type: HKObjectType) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            store.requestAuthorization(toShare: [], read: [type]) { success, error in
                if let error { continuation.resume(throwing: HealthError.authorization(error.localizedDescription)) }
                else if !success { continuation.resume(throwing: HealthError.authorization("用户未授予体重读取权限")) }
                else { continuation.resume() }
            }
        }
    }

    private func query(_ type: HKQuantityType) async throws -> [WeightSample] {
        let start = Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[WeightSample], Error>) in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit,
                                      sortDescriptors: [sort]) { _, results, error in
                if let error { continuation.resume(throwing: HealthError.query(error.localizedDescription)); return }
                guard let quantities = results as? [HKQuantitySample] else {
                    continuation.resume(throwing: HealthError.query("HealthKit 返回了无法识别的数据")); return
                }
                let unit = HKUnit.gramUnit(with: .kilo)
                let mapped = quantities.map { sample in
                    WeightSample(uuid: sample.uuid, type: "body_mass",
                                 value: Decimal(sample.quantity.doubleValue(for: unit)), unit: "kg",
                                 startDate: sample.startDate, endDate: sample.endDate,
                                 sourceName: sample.sourceRevision.source.name,
                                 sourceBundleId: sample.sourceRevision.source.bundleIdentifier,
                                 deviceName: sample.device?.name)
                }
                continuation.resume(returning: mapped)
            }
            store.execute(query)
        }
    }
}

enum HealthError: LocalizedError {
    case unavailable, typeUnavailable, authorization(String), query(String)
    var errorDescription: String? {
        switch self {
        case .unavailable: return "此设备不支持 Apple 健康数据"
        case .typeUnavailable: return "系统不支持体重数据类型"
        case .authorization(let reason): return "体重读取授权失败：\(reason)。可在“设置 > 健康 > 数据访问与设备”中检查权限"
        case .query(let reason): return "读取体重失败：\(reason)"
        }
    }
}
