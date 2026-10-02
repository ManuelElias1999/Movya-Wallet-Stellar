# Revisión de navegación y teclado

## Validación manual en iPhone y Android

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

- En Ingresar, Crear cuenta y Respaldo y claves, tocar el ojo muestra y oculta la contraseña sin cambiar su valor. Debe volver a ocultarse al comenzar una operación, borrar el campo o poner la app en segundo plano.
- Al crear una cuenta, Movya trabaja como herrero sobre una billetera. El texto refleja el paso real; al terminar se abre el respaldo sin una espera artificial. Cancelar o un error cierra la animación y permite volver al formulario.
- Activar Reducir movimiento: el taller debe mostrarse estático con un indicador de actividad.
- Antes de revelar el respaldo, tocar «Ya guardé mi respaldo». Aparece una advertencia para verificar la contraseña y la casilla permanece desmarcada. Escribir una contraseña sin verificarla tampoco habilita la confirmación. Después de revelar y guardar el respaldo, la casilla sí se puede marcar y desmarcar.

## Latencia de creación

El respaldo conserva PBKDF2-SHA256 con 600.000 iteraciones. Expo Go usa el cálculo JavaScript cuando no hay WebCrypto disponible. La primera creación y la recuperación en un dispositivo nuevo pueden tardar; cambiar el texto de progreso no acelera el cifrado.

El acceso posterior en el mismo teléfono reutiliza la copia local protegida únicamente después de autenticar la contraseña y comprobar propietario, dirección y huella del respaldo. No se reduce la protección ni se regenera la wallet al fallar.

La app incluye un módulo local para acelerar el cálculo fuera de JavaScript en una compilación propia. Expo Go mantiene el motor portable. Seguir [NATIVE_WALLET_CREATION.md](NATIVE_WALLET_CREATION.md) para instalar la app desde Xcode, comprobar la recuperación y medir en el teléfono. No se afirman tiempos de creación sin esa medición.

Las pruebas automatizadas cubren servicios, seguridad y selección de sección; la presentación visual y el comportamiento del teclado requieren esta revisión física.
