import Foundation

struct WeightSample: Identifiable, Codable, Sendable {
    let uuid: UUID
    let type: String
    let value: Decimal
    let unit: String
    let startDate: Date
    let endDate: Date
    let sourceName: String
    let sourceBundleId: String?
    let deviceName: String?

    var id: UUID { uuid }
    var valueText: String { NSDecimalNumber(decimal: value).stringValue + " kg" }
}

struct SyncRequest: Encodable { let samples: [WeightSample] }
struct SyncResponse: Decodable {
    let inserted: Int
    let duplicates: Int
    let received: Int
    let savedAt: String
}

struct LoginRequest: Encodable { let username: String; let password: String }
struct LoginResponse: Decodable { let token: String }
struct ServerError: Decodable { let message: String? }
