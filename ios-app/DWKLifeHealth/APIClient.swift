import Foundation

struct APIClient {
    let baseURL: URL

    init(serverAddress: String) throws {
        let value = serverAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: value), url.host != nil else { throw APIError.invalidURL }
        guard url.scheme?.lowercased() == "https" else { throw APIError.httpsRequired }
        baseURL = url
    }

    func sync(username: String, password: String, samples: [WeightSample]) async throws -> SyncResponse {
        guard !username.isEmpty, !password.isEmpty else { throw APIError.missingCredentials }
        let login: LoginResponse = try await send(path: "api/auth/login", body: LoginRequest(username: username, password: password), token: nil)
        return try await send(path: "api/health/sync", body: SyncRequest(samples: samples), token: login.token)
    }

    private func send<Body: Encodable, Response: Decodable>(path: String, body: Body, token: String?) async throws -> Response {
        let url = baseURL.appending(path: path)
        var request = URLRequest(url: url, timeoutInterval: 30)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(body)

        let data: Data
        let response: URLResponse
        do { (data, response) = try await URLSession.shared.data(for: request) }
        catch { throw APIError.network(error.localizedDescription) }
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ServerError.self, from: data).message) ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            throw APIError.server(http.statusCode, message)
        }
        do { return try JSONDecoder().decode(Response.self, from: data) }
        catch { throw APIError.decode(error.localizedDescription) }
    }
}

enum APIError: LocalizedError {
    case invalidURL, httpsRequired, missingCredentials, invalidResponse, network(String), server(Int, String), decode(String)
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "服务器地址无效，请填写完整地址，例如 https://example.com/life/"
        case .httpsRequired: return "服务器地址必须使用 HTTPS"
        case .missingCredentials: return "请填写服务器管理员账号和密码"
        case .invalidResponse: return "服务器返回了无效响应"
        case .network(let reason): return "网络请求失败：\(reason)"
        case .server(let code, let reason): return "服务器保存失败（HTTP \(code)）：\(reason)"
        case .decode(let reason): return "无法解析服务器响应：\(reason)"
        }
    }
}
