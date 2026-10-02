# Creación de wallet con cifrado nativo

## Por qué cambia

Expo Go usa el motor JavaScript para PBKDF2-SHA256 cuando no dispone de WebCrypto. La animación explica la espera, pero para acelerar ese cálculo la app debe incluir el módulo local `movya-password-key` en su propio binario.

El módulo usa CommonCrypto en iOS y SecretKeyFactory en Android 26+, fuera del hilo de JavaScript. Conserva 600.000 iteraciones, SHA256, salt de 16 bytes y clave de 32 bytes. No modifica el esquema, el formato de los respaldos ni las wallets existentes. No recibe frases o claves privadas, no usa la red y no registra contraseñas ni claves en logs.

Web sigue usando WebCrypto. Expo Go y Android anteriores a API 26 conservan el motor portable. Si un módulo instalado falla, el error se muestra y no se cambia silenciosamente de motor.

## Probar en el iPhone desde el Mac

1. Actualizar el repositorio e instalar las dependencias:

   ```bash
   cd ~/Documents/Movya-Wallet-Stellar
   git switch main
   git pull --ff-only origin main
   npm install
   ```

2. Con Xcode instalado, conectar el iPhone y ejecutar:

   ```bash
   npx expo run:ios --device
   ```

   Este comando genera los proyectos nativos e instala los pods. Se requiere configurar la firma de Apple en Xcode si aún no está preparada. La prueba se abre en la app instalada, no en Expo Go. Los proyectos generados no deben subirse al repositorio; el módulo local sí está versionado. No hace falta generar un proyecto EAS ni publicar en App Store para esta prueba local.

3. Mantener el `.env` de Supabase y Stellar Testnet. Registrar una cuenta de prueba nueva y anotar el tiempo que aparece en la pantalla del taller. Comparar con Expo Go en el mismo teléfono y red. No se promete un tiempo sin esa medición: Supabase y el almacenamiento también pueden tardar.

4. Confirmar que una cuenta existente conserva su dirección, que se recupera en otro dispositivo con la misma contraseña y que una contraseña incorrecta no abre su respaldo.

Para Android: `npx expo run:android --device`, con Android Studio/SDK configurados. Para volver a probar la interfaz sin compilar: `npx expo start --go --clear`; en este caso la aceleración nativa no está disponible.

## Validación y límites

Las pruebas comparan ambas implementaciones contra vectores independientes de Node/OpenSSL, con ASCII, tildes, emoji y NUL, y rechazan parámetros incompatibles. CI compila el helper Swift con CommonCrypto en macOS y el helper Kotlin en la JVM; esto no equivale a compilar y probar la app completa en iPhone/Android. La integración del puente Expo, el teclado y el tiempo real requieren la prueba física anterior.

El taller muestra la etapa real y el tiempo transcurrido. Se cierra cuando la operación termina, falla o se cancela, sin pausas artificiales ni un porcentaje simulado. Respeta Reducir movimiento. Durante el acceso la contraseña permanece oculta y nunca forma parte de la animación.
