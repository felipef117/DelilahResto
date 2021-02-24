const express = require('express');
const app = express();
const helmet = require('helmet');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const MD5 = require('./utils');
const db = require("./db");
const moment = require('moment');

const secreto = "147258369";

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(helmet());
app.use(cors());

const autenticacionUser = (req, res, next) => {
    try{
        const autorizationHeader = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(autorizationHeader, secreto)
        console.log(decodedToken);
        req.authorizationInfo = decodedToken;
        next();
    }catch (error) {
        res.status(401);
        res.send("Error de autenticación")
    }
}

//Registro de usuario
app.post("/usuarios/registro", async (req, res) => {
    const usuario = req.body.usuario;
    const nombre = req.body.nombre;
    const email = req.body.email;
    const telefono = req.body.telefono;
    const direccion = req.body.direccion;
    const password = MD5(req.body.password);

    if(usuario.length <=4 ) {
        res.status(400);
        res.json("El nombre de usuario debe ser mayor a 4 caracteres")
        return
    }

    try{
        var respuesta = await db.sequelize.query("INSERT INTO usuarios (usuario, nombre, email, telefono, direccion, password) VALUES (:usuario, :nombre, :email, :telefono, :direccion, :password)", {
            replacements: {
                usuario: usuario,
                nombre: nombre,
                email: email,
                telefono: telefono,
                direccion: direccion,
                password: password
            },
            type: db.sequelize.QueryTypes.INSERT,
        });
    }catch (error) {
        console.log(error);
        res.status(500);
        res.end();
    }
    res.status(201);
    res.send("Usuario registrado exitosamente");
});

//Login usuario
app.post("/usuarios/login", async (req, res) => {
    const MD5Password = MD5(req.body.password);
    const usuarioEncontrado = await db.sequelize.query(
        "SELECT * FROM `usuarios` WHERE email = :email AND password = :password",
        {
            replacements: {
                email: req.body.email, 
                password: MD5Password
            },
            type: db.sequelize.QueryTypes.SELECT,
        }
    );
    console.log(usuarioEncontrado);

    if (usuarioEncontrado.length === 1) {
        const jwtUsuario = jwt.sign(
            {
            usuario_id: usuarioEncontrado[0].usuario_id,
            usuario: usuarioEncontrado[0].email,
            nombre: usuarioEncontrado[0].nombre,
            admin: usuarioEncontrado[0].is_admin,
            },
            secreto
        );
        res.status(200);
        res.json(jwtUsuario);

    }else{
        res.status(401);
        res.json({error: "Usuario y/o contraseña incorrectos"});  
    }
});

//crear productos
app.post("/productos", autenticacionUser, async (req, res) => {

    if (req.authorizationInfo.admin === 1) {
         try{
            await db.sequelize.query(
                "INSERT INTO productos (`plato`, `descripcion`, `precio`) VALUES (:plato, :descripcion, :precio)",
                {
                    replacements: {
                        plato: req.body.plato,
                        descripcion: req.body.descripcion,
                        precio: req.body.precio,
                    },
                    type: db.sequelize.QueryTypes.INSERT,
                }
            );
            res.status(200);
            res.json("Producto creado con exito");      
        }catch (err){
            res.status(500);
        }
    }else{
         res.status(403);
         res.send("No autorizado, por favor ingresar como administrador");
    }
});

//actualizar productos
app.put("/productos/:productoId", autenticacionUser, async (req, res) => {
    const productoId = req.params.productoId;
    if (req.authorizationInfo.admin === 1) {
        try{  
            const producto = await db.sequelize.query(
                "UPDATE productos SET plato = :plato, descripcion = :descripcion, precio = :precio WHERE producto_id = :productoId",
                {
                    replacements: {
                        plato: req.body.plato,
                        descripcion: req.body.descripcion,
                        precio: req.body.precio,
                        productoId: productoId,
                    },
                    type: db.sequelize.QueryTypes.UPDATE,
                }
            );
            res.status(200);
            res.json('Producto actualizado con exito.');     
        }catch (err){
            res.status(500);
        }
    }else{
         res.status(403);
         res.send("No autorizado, por favor ingresar como administrador");
    }
});

//Borrar producto
app.delete("/productos/:productoId", autenticacionUser, async (req, res) => {

    const productoId = req.params.productoId;
    console.log(req.authorizationInfo)
    if(req.authorizationInfo.admin != 1) {
        res.status(403);
        res.send("No autorizado, por favor ingresar como administrador");   
    }else{

    try{    
        const producto = await db.sequelize.query(
            "DELETE FROM productos WHERE producto_id = :productoId", {
                replacements: {
                    productoId: productoId,
                },
                type: db.sequelize.QueryTypes.DELETE,
            }
        );

    }catch(error) {
        res.status(500);
        res.end();
    }
    res.status(200);
    res.json("Producto borrado exitosamente")
    }
});

//listar productos
app.get("/productos", autenticacionUser, async (req, res) => {
    try{
        var productos = await db.sequelize.query("SELECT * FROM productos", {
            type: db.sequelize.QueryTypes.SELECT,
        });
    }catch(error) {
        console.log(error);
        res.status(500);
        res.end();
    }
    res.status(200);
    res.json(productos);
});

//listar producto por id
app.get("/productos/:productoId", autenticacionUser, async (req, res) => {
    const productoId = req.params.productoId
    try{
        var producto = await db.sequelize.query("SELECT * FROM productos WHERE producto_id = :productoId", {
            replacements: {
                productoId: productoId,
            },
            type: db.sequelize.QueryTypes.SELECT,
        });
        
        if(producto.length === 0){
            res.status(404);
            res.send('Producto no encontrado');
            return
        }
    }catch(error) {
        res.status(401);
        res.end();
    }
    res.status(200);
    res.json(producto)
});

//crear pedido
app.post("/pedidos", autenticacionUser, async (req, res) => {
    const productos = req.body.productos;
    const pago_id = req.body.pago_id;
    const total_pedido = req.body.total_pedido;
    const producto_id = req.body.productos.producto_id;
    const cantidad = req.body.productos.cantidad;
    const usuario = req.authorizationInfo.nombre
    try{
        const insert1 = await db.sequelize.query("INSERT INTO pedidos (`usuario_id`, `total_pedido`, `pago_id`) VALUES (:usuario_id, :total_pedido, :pago_id)",
            {
                replacements:{
                    usuario_id: req.authorizationInfo.usuario_id,
                    total_pedido: total_pedido,
                    pago_id: pago_id,
                },
                type: db.sequelize.QueryTypes.INSERT,
            }
        );
            if(insert1 !=0) {
                console.log(productos)
                productos.forEach(producto => {db.sequelize.query("INSERT INTO productosporpedido (`pedido_id`, `producto_id`, `cantidad`) VALUES (:pedido_id, :producto_id, :cantidad)",
                        {
                            replacements:{
                                pedido_id: insert1[0],
                                producto_id: producto.producto_id,
                                cantidad: producto.cantidad  
                            },
                            type: db.sequelize.QueryTypes.INSERT,
                        }
                    );
                }); 
            }
        res.status(200)
        res.send(`¡Recibimos tu pedido! ${usuario}, gracias por pedir a Delilah. Puedes seguir tu pedido para saber dónde está.`);

    }catch (error){
        res.status(401)
    }
});

//consultar pedidos
app.get("/pedidos", autenticacionUser, async (req, res) => {
    if(req.authorizationInfo.usuario_id != 1) {
        try{
            const usuario_id = req.authorizationInfo.usuario_id;
            const pedido = await db.sequelize.query("SELECT pedidos.pedido_id AS 'Pedido', estados.estado, GROUP_CONCAT(concat(cantidad, 'x', productos.plato) SEPARATOR ', ') AS 'Detalle', pedidos.total_pedido AS 'Total', formas_pago.forma_pago AS 'Forma de pago', usuarios.direccion FROM pedidos INNER JOIN productosporpedido ON productosporpedido.pedido_id = pedidos.pedido_id INNER JOIN usuarios ON usuarios.usuario_id = pedidos.usuario_id INNER JOIN estados ON estados.estado_id = pedidos.estado_id INNER JOIN formas_pago ON formas_pago.pago_id = pedidos.pago_id INNER JOIN productos ON productos.producto_id = productosporpedido.producto_id WHERE usuarios.usuario_id = :usuario_id GROUP BY productosporpedido.pedido_id", {
                replacements: {
                    usuario_id: usuario_id,
                },
                type: db.sequelize.QueryTypes.SELECT,
            });
            res.status(200);
            res.json(pedido);
            console.log(pedido)
        }catch(error){
            res.status(500)
            res.end()
        }
    }else{
        try{
            const pedidos = await db.sequelize.query("SELECT pedidos.pedido_id AS 'Pedido', estados.estado AS 'Estado', TIME(pedidos.fecha) AS Hora, GROUP_CONCAT(concat(cantidad, 'x', productos.plato) SEPARATOR ', ') AS 'Detalle', pedidos.total_pedido AS 'Total', formas_pago.forma_pago AS 'Forma de pago', usuarios.nombre AS 'Usuario', usuarios.direccion FROM pedidos INNER JOIN productosporpedido ON productosporpedido.pedido_id = pedidos.pedido_id INNER JOIN usuarios ON usuarios.usuario_id = pedidos.usuario_id INNER JOIN estados ON estados.estado_id = pedidos.estado_id INNER JOIN formas_pago ON formas_pago.pago_id = pedidos.pago_id INNER JOIN productos ON productos.producto_id = productosporpedido.producto_id GROUP BY productosporpedido.pedido_id", {
                type: db.sequelize.QueryTypes.SELECT,
            });
            res.status(200);
            res.json(pedidos);
            console.log(pedidos)
        }catch(error){
            res.status(500)
            res.end()
        }
    }   
})

//consultar pedido por id
app.get("/pedidos/:id", autenticacionUser, async (req, res) => {
    if(req.authorizationInfo.usuario_id != 1) {
        try{
            const usuario_id = req.authorizationInfo.usuario_id;
            const id = req.params.id;
            var pedido = await db.sequelize.query("SELECT pedidos.pedido_id AS 'Pedido', estados.estado, GROUP_CONCAT(concat(cantidad, 'x', productos.plato) SEPARATOR ', ') AS 'Detalle', pedidos.total_pedido AS 'Total', formas_pago.forma_pago AS 'Forma de pago', usuarios.direccion FROM pedidos INNER JOIN productosporpedido ON productosporpedido.pedido_id = pedidos.pedido_id INNER JOIN usuarios ON usuarios.usuario_id = pedidos.usuario_id INNER JOIN estados ON estados.estado_id = pedidos.estado_id INNER JOIN formas_pago ON formas_pago.pago_id = pedidos.pago_id INNER JOIN productos ON productos.producto_id = productosporpedido.producto_id WHERE usuarios.usuario_id = :usuario_id AND pedidos.pedido_id = :id GROUP BY productosporpedido.pedido_id", 
                {
                    replacements: {
                        usuario_id: usuario_id,
                        id: id,
                    },
                    type: db.sequelize.QueryTypes.SELECT,
                }
            );
            if (pedido.length === 1){
                res.status(200);
                res.json(pedido);
            }else{
                res.status(404);
                res.json({error: "Pedido no encontrado"});
            }
            
        }catch(error){
            res.status(500)
            res.end()
        }
    }else{
        try{
            const id = req.params.id;
            const pedidos = await db.sequelize.query("SELECT pedidos.pedido_id AS 'Pedido', estados.estado AS 'Estado', TIME(pedidos.fecha) AS Hora, GROUP_CONCAT(concat(cantidad, 'x', productos.plato) SEPARATOR ', ') AS 'Detalle', pedidos.total_pedido AS 'Total', formas_pago.forma_pago AS 'Forma de pago', usuarios.nombre AS 'Usuario', usuarios.direccion FROM pedidos INNER JOIN productosporpedido ON productosporpedido.pedido_id = pedidos.pedido_id INNER JOIN usuarios ON usuarios.usuario_id = pedidos.usuario_id INNER JOIN estados ON estados.estado_id = pedidos.estado_id INNER JOIN formas_pago ON formas_pago.pago_id = pedidos.pago_id INNER JOIN productos ON productos.producto_id = productosporpedido.producto_id WHERE pedidos.pedido_id = :id GROUP BY productosporpedido.pedido_id", {
                replacements: {
                    id: id,
                },
                type: db.sequelize.QueryTypes.SELECT,
            });
            if (pedidos.length === 1){
                res.status(200);
                res.json(pedidos);
            }else{
                res.status(404);
                res.json({error: "Pedido no encontrado"});
            }
        }catch(error){
            res.status(500)
            res.end()
        }
    }   
});

// modificar estado del pedido
app.patch("/pedidos/:id", autenticacionUser, async (req, res) => {
    const pedido_id = req.params.id;
    if (req.authorizationInfo.admin === 1) {
        try{  
            await db.sequelize.query(
                "UPDATE pedidos SET estado_id = :estado_id WHERE pedido_id = :pedido_id",
                {
                    replacements: {
                        estado_id: req.body.estado_id,
                        pedido_id: pedido_id,
                    },
                    type: db.sequelize.QueryTypes.UPDATE,
                }
            );
            res.status(200);
            res.send("El estado del pedido se ha actualizado con exito");      
        }catch (err){
            res.status(500);
        }
    }else{
         res.status(403);
         res.send("No autorizado, por favor ingresar como administrador");
    }
});

// borrar pedido
app.delete("/pedidos/:id", autenticacionUser, async (req, res) => {
    const pedido_id = req.params.id;
    if (req.authorizationInfo.admin === 1) {
        try{  
            await db.sequelize.query(
                "DELETE FROM pedidos WHERE pedido_id = :pedido_id",
                {
                    replacements: {
                        pedido_id: pedido_id,
                    },
                    type: db.sequelize.QueryTypes.DELETE,
                }
            );
            res.status(200);
            res.send("El pedido se ha borrado con exito");      
        }catch (err){
            res.status(500);
        }
    }else{
         res.status(403);
         res.send("No autorizado, por favor ingresar como administrador");
    }
});

app.listen(3000, () => {
    console.log("Server Corriendo en el puerto 3000");
});
