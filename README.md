# DelilahResto

1. Instalamos la aplicación XAMPP y ejecutamos para correr el servidor apache y PhpMyAdmin.

2. Abrimos el phpMyAdmin y copiamos las queries del archivo llamado query.sql, y las corremos en la consola SQL para crear la base de datos y las tablas, e inicializara las tablas para poder empezar a crear usuarios y pedidos, la tabla usuarios ya contiene el administrador, para loguearse con el administrador se realiza una petición POST los siguientes datos: {"email": "andresacosta@delilah.com", "password": "admin123"}.

3. Clonar el repositorio: https://github.com/felipef117/DelilahResto

4. Abrir la consola y ejecutar el comando "npm install"

5. Para correr el proyecto ejecutamos en la consola el comando "nodemon app.js", luego se mostrara un mensaje en el que nos indica: "Server Corriendo en el puerto 3000", la app funciona en http://localhost:3000/.

6. Abrimos Postman (Si no lo tenemos instalado, descargarlo: https://www.postman.com/downloads/) para empezar a realizar pedidos, registrar usuarios y agregar productos, podemos utilizar el archivo 'documentacion.yaml' para ver el listado de peticiones.

7. Para poder empezar a realizar peticiones debemos loguearnos lo cual nos devuelve el JWT que debemos incluirlo en cada una de las peticiones en "Headers, Authorization y anteponiendole la palabra Bearer y un espacio al valor del jwt".
