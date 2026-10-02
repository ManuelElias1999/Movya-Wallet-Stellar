import expo.modules.movyapasswordkey.MovyaPasswordKey

fun main() {
  val vectors = listOf(
    "Movya-test-password-2026" to "e9e4656cd2aa96b4f8681cd440287ea8eeee2b7e0bdab40278c72f5a5cb589fc",
    "contraseña-con-ñ-y-🔐" to "50696568578298053c3756e3731f0bf2ff77a475c40e0e9eb44d460c37f14d66",
    "clave\u0000con-nulo-1234" to "ed1ec42615fd89c0a3ccefa211dec77ffebaec6533dfd43fe1f832d05683694d"
  )
  val salt = ByteArray(16) { it.toByte() }
  for ((password, expected) in vectors) {
    val input = password.toByteArray(Charsets.UTF_8)
    val key = MovyaPasswordKey.derive(input, salt, 600_000)
    check(key.joinToString("") { "%02x".format(it.toInt() and 0xff) } == expected)
    check(input.contentEquals(password.toByteArray(Charsets.UTF_8)))
    key.fill(0)
    println("JCA vector passed (JVM provider; Android device QA still required)")
  }
  for ((password, salt, rounds) in listOf(
    Triple(ByteArray(0), salt, 600_000), Triple("password".toByteArray(), ByteArray(0), 600_000),
    Triple("password".toByteArray(), salt, 100_000), Triple(byteArrayOf(0xff.toByte()), salt, 600_000)
  )) {
    val error = runCatching { MovyaPasswordKey.derive(password, salt, rounds) }.exceptionOrNull()
    check(error != null) { "Invalid parameters accepted" }
  }
}
