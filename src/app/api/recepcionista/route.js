// src/app/api/recepcionista/route.js
import { connectDB } from '@/app/lib/db';

// GET - Obtener productos y datos para el formulario de salidas
export async function GET(request) {
  try {
    const connection = await connectDB();

    // Obtener productos activos con stock disponible
    const [productos] = await connection.execute(
      'SELECT id, nombre, marca, stock_actual, precio_venta FROM productos WHERE activo = 1 AND stock_actual > 0 ORDER BY nombre ASC'
    );

    // Obtener usuarios para el campo responsable
    const [usuarios] = await connection.execute(
      'SELECT id, nombre FROM usuarios WHERE activo = 1 ORDER BY nombre ASC'
    );

    // Obtener salidas recientes (últimas 20)
    const [salidas] = await connection.execute(`
      SELECT 
        si.id,
        si.cantidad,
        si.precio_unitario,
        si.tipo_salida,
        si.destino,
        si.fecha_salida,
        si.observaciones,
        p.nombre as producto_nombre,
        p.marca as producto_marca,
        u.nombre as responsable_nombre
      FROM salidas_inventario si
      LEFT JOIN productos p ON si.producto_id = p.id
      LEFT JOIN usuarios u ON si.responsable = u.id
      ORDER BY si.fecha_salida DESC
      LIMIT 20
    `);

    return Response.json({
      success: true,
      data: {
        productos,
        usuarios,
        salidas
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error en GET salidas:', error);
    return Response.json({
      success: false,
      message: 'Error al cargar datos: ' + error.message
    }, { status: 500 });
  }
}

// POST - Registrar nueva salida
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      producto_id,
      cantidad,
      tipo_salida,
      destino,
      precio_unitario,
      responsable,
      registrado_por,
      observaciones,
      fecha_salida
    } = body;

    // Validaciones
    if (!producto_id || !cantidad || !tipo_salida || !fecha_salida || !registrado_por) {
      return Response.json({
        success: false,
        message: 'Campos requeridos: producto, cantidad, tipo de salida, fecha y registrado por'
      }, { status: 400 });
    }

    if (cantidad <= 0) {
      return Response.json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      }, { status: 400 });
    }

    const connection = await connectDB();

    // Verificar stock disponible
    const [producto] = await connection.execute(
      'SELECT stock_actual, nombre FROM productos WHERE id = ?',
      [producto_id]
    );

    if (producto.length === 0) {
      return Response.json({
        success: false,
        message: 'Producto no encontrado'
      }, { status: 404 });
    }

    const stockActual = producto[0].stock_actual;
    if (stockActual < cantidad) {
      return Response.json({
        success: false,
        message: `Stock insuficiente. Solo hay ${stockActual} unidades disponibles`
      }, { status: 400 });
    }

    // Insertar salida
    const [result] = await connection.execute(
      `INSERT INTO salidas_inventario 
       (producto_id, cantidad, tipo_salida, destino, precio_unitario, 
        responsable, registrado_por, observaciones, fecha_salida, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        producto_id,
        cantidad,
        tipo_salida,
        destino || null,
        precio_unitario || null,
        responsable || null,
        registrado_por,
        observaciones || null,
        fecha_salida
      ]
    );

    // Actualizar stock del producto
    await connection.execute(
      `UPDATE productos 
       SET stock_actual = stock_actual - ?, 
           fecha_actualizacion = NOW()
       WHERE id = ?`,
      [cantidad, producto_id]
    );

    // Registrar auditoría
    await connection.execute(
      `INSERT INTO auditoria_inventario 
       (usuario_id, accion, tabla_afectada, registro_id, detalles, fecha_auditoria)
       VALUES (?, 'INSERT', 'salidas_inventario', ?, ?, NOW())`,
      [
        registrado_por,
        result.insertId,
        `Salida de ${cantidad} unidades del producto ${producto_id} - Tipo: ${tipo_salida}`
      ]
    );

    return Response.json({
      success: true,
      message: 'Salida registrada exitosamente',
      data: { id: result.insertId }
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST salidas:', error);
    return Response.json({
      success: false,
      message: 'Error al registrar salida: ' + error.message
    }, { status: 500 });
  }
}