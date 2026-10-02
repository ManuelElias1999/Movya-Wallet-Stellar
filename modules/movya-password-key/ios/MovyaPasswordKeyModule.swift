import ExpoModulesCore
import Foundation

public class MovyaPasswordKeyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MovyaPasswordKey")
    AsyncFunction("deriveAsync") { (passwordBase64: String, saltBase64: String, iterations: Int) -> String in
      guard var password = Data(base64Encoded: passwordBase64),
            let salt = Data(base64Encoded: saltBase64) else {
        throw NSError(domain: "MovyaPasswordKey", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Invalid backup key parameters"])
      }
      defer { password.resetBytes(in: 0..<password.count) }
      var key = try MovyaPasswordKey.derive(password: password, salt: salt, iterations: iterations)
      defer { key.resetBytes(in: 0..<key.count) }
      return key.map { String(format: "%02x", $0) }.joined()
    }.runOnQueue(DispatchQueue.global(qos: .userInitiated))
  }
}
