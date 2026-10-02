import Foundation
import CommonCrypto

enum MovyaPasswordKey {
  static func derive(password: Data, salt: Data, iterations: Int) throws -> Data {
    guard iterations == 600_000, salt.count == 16, !password.isEmpty else {
      throw NSError(domain: "MovyaPasswordKey", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid backup key parameters"])
    }
    var output = Data(count: 32)
    let status = output.withUnsafeMutableBytes { key in
      password.withUnsafeBytes { pass in
        salt.withUnsafeBytes { saltBytes in
          CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2),
            pass.bindMemory(to: Int8.self).baseAddress, password.count,
            saltBytes.bindMemory(to: UInt8.self).baseAddress, salt.count,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(iterations),
            key.bindMemory(to: UInt8.self).baseAddress, 32)
        }
      }
    }
    guard status == kCCSuccess else {
      output.resetBytes(in: 0..<output.count)
      throw NSError(domain: "MovyaPasswordKey", code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "Backup key derivation failed"])
    }
    return output
  }
}
