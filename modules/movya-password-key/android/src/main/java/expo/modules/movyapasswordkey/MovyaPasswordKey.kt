package expo.modules.movyapasswordkey

import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

object MovyaPasswordKey {
  fun derive(password: ByteArray, salt: ByteArray, iterations: Int): ByteArray {
    require(iterations == 600_000 && salt.size == 16 && password.isNotEmpty()) { "Invalid backup key parameters" }
    // Preserve UTF-8, including accents, emoji and embedded NUL. Never use
    // a platform-default charset or normalize the password.
    val decoded = StandardCharsets.UTF_8.newDecoder()
      .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
      .decode(ByteBuffer.wrap(password))
    val chars = CharArray(decoded.remaining())
    decoded.get(chars)
    if (decoded.hasArray()) decoded.array().fill('\u0000')
    val spec = PBEKeySpec(chars, salt, iterations, 256)
    chars.fill('\u0000')
    return try { SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded }
      finally { spec.clearPassword() }
  }
}
