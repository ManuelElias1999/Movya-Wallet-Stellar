# Revisión de navegación y teclado

## Validación manual en iPhone y Android

- Revisar Inicio en teléfonos estrechos y con nombres largos: el header de vidrio azul mantiene el saludo y los botones de actualizar/ajustes sin desbordar. El header, los accesos y los botones de fondos comparten el degradado, blur y borde del footer. Los cuatro accesos tienen iconos y etiquetas blancas, y abren las mismas rutas que antes. La tarjeta no tiene una franja blanca en su borde superior.
- Comprobar la presentación compacta: header de 68 px y accesos principales de 72 px, conservando controles de header de 44 px. El contenido puede crecer con tamaños de texto accesibles.
- Revisar el contorno fino de Movya en bienvenida, los cuatro pasos de la guía, tarjeta, footer, chat, ayuda contextual y pantallas de apertura/creación. Todos deben usar el mismo logo compartido, sin un borde más grueso en la demo.
- Cambiar Inicio → Actividad → Contactos → Cuenta → Inicio. La barra inferior debe permanecer quieta; la sección seleccionada cambia sin deslizar toda la pantalla.
- Abrir una sección desde un enlace directo y tocar Volver. Actividad, Contactos y Cuenta vuelven a Inicio sin depender de un historial previo.
- Desde Cuenta abrir Seguridad: su encabezado ocupa todo el ancho. Respaldo y claves vuelve a Seguridad y Seguridad vuelve a Cuenta.
- Registrar dos usuarios con nombres distintos: la tarjeta y el saludo del chat usan el nombre de cada sesión; no muestran un nombre fijo.
- En el respaldo inicial comprobar que el icono y el texto de confirmación están centrados y que un texto largo se ajusta al ancho.
- Abrir Movya desde las cuatro secciones: solo hay una flecha superior para cerrar el chat. El campo de texto y ambos botones están centrados. La tecla Listo oculta el teclado; enviar sigue siendo una acción del botón de envío.
- Abrir los formularios de agregar y editar contacto. Se pueden desplazar con el teclado abierto y cerrar con su tecla Listo. No aparecen botones externos de Ocultar teclado.
- En teclados numéricos que no ofrecen Listo, deslizar el formulario para ocultar el teclado. Revisar que confirmar y cerrar continúan accesibles.
- Cerrar y volver a abrir sesión; no debe repetirse la guía. Probar también restauración en otro dispositivo y el acceso a claves con contraseña.

## Creación y respaldo

- En Ingresar y Crear cuenta escribir `1234`, tocar correo, volver a contraseña y escribir `5`: debe quedar `12345`. Ocultar el teclado, volver y borrar: debe quedar `1234`, no vacío. Repetir varias veces; al borrar no debe aparecer texto en claro ni parpadear toda la contraseña. Repetir con la contraseña visible, selección parcial, seleccionar todo, pegar y autocompletar. Revisar físicamente en iPhone (incluido Expo Go) y Android; las pruebas del componente no sustituyen esta comprobación de UIKit y del teclado nativo.
- Completar correo y contraseña en Ingresar, cambiar a Crear cuenta: nombre, correo y contraseña quedan vacíos y el ojo queda cerrado. Escribir datos y volver a Ingresar: correo y contraseña también vacíos. Tocar la pestaña ya seleccionada conserva lo escrito. Cambiar de campo o cerrar el teclado sin cambiar de pestaña conserva los datos.
- En Ingresar, Crear cuenta y Respaldo y claves, tocar el ojo muestra y oculta la contraseña sin cambiar su valor. Debe volver a ocultarse al comenzar una operación, borrar el campo o poner la app en segundo plano.
- Al crear una cuenta, Movya trabaja como herrero sobre una billetera. El texto refleja el paso real; al terminar se abre el respaldo sin una espera artificial. Cancelar o un error cierra la animación y permite volver al formulario.
- En el taller, comprobar el rostro desde el primer fotograma incluso con carga lenta de imágenes. El brazo nace en el hombro y el martillo llega a la parte superior de la billetera, con chispas en el contacto. Revisar también una pantalla de 320 px: la escena debe reducirse sin desbordar.
- Activar Reducir movimiento: el taller debe mostrarse estático con un indicador de actividad.
- Antes de revelar el respaldo, tocar «Ya guardé mi respaldo». Aparece una advertencia para verificar la contraseña y la casilla permanece desmarcada. Escribir una contraseña sin verificarla tampoco habilita la confirmación. Después de revelar y guardar el respaldo, la casilla sí se puede marcar y desmarcar.

## Latencia de creación

El respaldo conserva PBKDF2-SHA256 con 600.000 iteraciones. Expo Go usa el cálculo JavaScript cuando no hay WebCrypto disponible. La primera creación y la recuperación en un dispositivo nuevo pueden tardar; cambiar el texto de progreso no acelera el cifrado.

El acceso posterior en el mismo teléfono reutiliza la copia local protegida únicamente después de autenticar la contraseña y comprobar propietario, dirección y huella del respaldo. No se reduce la protección ni se regenera la wallet al fallar.

La app incluye un módulo local para acelerar el cálculo fuera de JavaScript en una compilación propia. Expo Go mantiene el motor portable. Seguir [NATIVE_WALLET_CREATION.md](NATIVE_WALLET_CREATION.md) para instalar la app desde Xcode, comprobar la recuperación y medir en el teléfono. No se afirman tiempos de creación sin esa medición.

Las pruebas automatizadas cubren servicios, seguridad y selección de sección; la presentación visual y el comportamiento del teclado requieren esta revisión física.

## Campo de contraseña en iOS

El campo no vacía, restaura ni reconstruye la contraseña desde JavaScript. El parche `scripts/patch-ios-password.cjs`, aplicado por postinstall, hace que los campos protegidos usen la ruta de sustitución de rangos que ya incluye el adaptador nativo de React Native. Así se aplican la inserción, el borrado y la selección antes de que UIKit pueda reemplazar todo al retomar la edición. Mantiene el modo protegido, los límites del delegado, la posición del cursor y la notificación de cambios.

Se requiere compilar la app siguiendo [NATIVE_WALLET_CREATION.md](NATIVE_WALLET_CREATION.md). El plugin obliga a compilar RNCore desde la fuente modificada. Expo Go conserva su control nativo original y no recibe este parche. Las pruebas del componente comprueban que JavaScript nunca vacía el valor al enfocar. La prueba `bash scripts/test-ios-password.sh` ejecuta el método real extraído del adaptador instalado contra un campo UIKit en el simulador; no equivale a probar la app completa ni confirma la ausencia de parpadeo en un iPhone físico.

## Español e inglés

- Cambiar ES/EN desde Ingresar y Crear cuenta con datos escritos: cambian textos y placeholders, sin borrar los campos ni cambiar de modo. Al cambiar entre Ingresar/Crear cuenta sí quedan vacíos, como antes.
- Cambiar el idioma en Inicio o Ajustes, navegar por actividad, contactos, enviar, recibir, swap, seguridad y respaldo, y volver al acceso. Se mantiene la elección. Cerrar y reabrir conserva el idioma.
- Verificar etiquetas, ayuda, alertas, etapas de creación y avisos de error de la app. Errores desconocidos de proveedores externos se muestran sin inventar una traducción.
- Comprobar que nombres, correos, mensajes del usuario, direcciones, claves privadas y las 12 palabras no cambian. Una persona llamada «Inicio» no debe convertirse en «Home».
- Probar las sugerencias del chat en ambos idiomas. «Send 1 XLM to Aya» y «Envía 1 XLM a Aya» deben abrir la misma revisión, sin firmar automáticamente.
