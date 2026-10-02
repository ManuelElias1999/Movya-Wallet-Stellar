import Foundation

// Expected outputs come from Node/OpenSSL PBKDF2-SHA256, independently of
// CommonCrypto. These exercise the same helper used by the Expo module.
let vectors = [
  ("Movya-test-password-2026", "e9e4656cd2aa96b4f8681cd440287ea8eeee2b7e0bdab40278c72f5a5cb589fc"),
  ("contraseña-con-ñ-y-🔐", "50696568578298053c3756e3731f0bf2ff77a475c40e0e9eb44d460c37f14d66"),
  ("clave\u{0}con-nulo-1234", "ed1ec42615fd89c0a3ccefa211dec77ffebaec6533dfd43fe1f832d05683694d")
]
let salt = Data((0..<16).map { UInt8($0) })
for (password, expected) in vectors {
  let start = Date()
  let key = try MovyaPasswordKey.derive(password: Data(password.utf8), salt: salt, iterations: 600_000)
  let actual = key.map { String(format: "%02x", $0) }.joined()
  precondition(actual == expected, "Native PBKDF2 differs from existing backup format")
  print("CommonCrypto vector passed (\(Int(Date().timeIntervalSince(start) * 1000)) ms, CI host)")
}
for (password, salt, rounds) in [(Data(), salt, 600_000), (Data("password".utf8), Data(), 600_000), (Data("password".utf8), salt, 100_000)] {
  do {
    _ = try MovyaPasswordKey.derive(password: password, salt: salt, iterations: rounds)
    preconditionFailure("Invalid parameters accepted")
  } catch { /* expected */ }
}
