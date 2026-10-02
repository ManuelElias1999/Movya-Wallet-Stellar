package expo.modules.movyapasswordkey

import android.util.Base64
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MovyaPasswordKeyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MovyaPasswordKey")
    AsyncFunction("deriveAsync") Coroutine { passwordBase64: String, saltBase64: String, iterations: Int ->
      withContext(Dispatchers.Default) {
        val password = Base64.decode(passwordBase64, Base64.NO_WRAP)
        val salt = Base64.decode(saltBase64, Base64.NO_WRAP)
        try {
          val key = MovyaPasswordKey.derive(password, salt, iterations)
          try { key.joinToString("") { "%02x".format(it.toInt() and 0xff) } }
          finally { key.fill(0) }
        } finally { password.fill(0) }
      }
    }
  }
}
