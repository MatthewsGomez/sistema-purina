// src/app/api/bodega/entradas/route.js
import { connectDB } from '@/app/lib/db';

// GET - Obtener productos y proveedores para el formulario
export async function GET(request) {
  try {
    const connection = await connectDB();

    // Obtener productos activos
    const [productos] = await connection.execute(
      'SELECT id, nombre, marca, stock_actual, precio_compra FROM productos WHERE activo = 1 ORDER BY nombre ASC'
    );

    // Obtener proveedores activos
    const [proveedores] = await connection.execute(
      'SELECT id, nombre, contacto, telefono FROM proveedores WHERE activo = 1 ORDER BY nombre ASC'
    );

    // Obtener entradas recientes (últimas 20)
    const [entradas] = await connection.execute(`
      SELECT 
        ei.id,
        ei.cantidad,
        ei.precio_unitario,
        ei.numero_lote,
        ei.fecha_entrada,
        ei.fecha_caducidad,
        ei.recibido_por,
        ei.observaciones,
        p.nombre as producto_nombre,
        p.marca as producto_marca,
        pr.nombre as proveedor_nombre
      FROM entradas_inventario ei
      LEFT JOIN productos p ON ei.producto_id = p.id
      LEFT JOIN proveedores pr ON ei.proveedor_id = pr.id
      ORDER BY ei.fecha_entrada DESC
      LIMIT 20
    `);

    return Response.json({
      success: true,
      data: {
        productos,
        proveedores,
        entradas
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error en GET entradas:', error);
    return Response.json({
      success: false,
      message: 'Error al cargar datos: ' + error.message
    }, { status: 500 });
  }
}

// POST - Registrar nueva entrada
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      producto_id,
      proveedor_id,
      cantidad,
      precio_unitario,
      numero_lote,
      fecha_entrada,
      fecha_caducidad,
      recibido_por,
      registrado_por,
      observaciones
    } = body;

    // Validaciones
    if (!producto_id || !cantidad || !precio_unitario || !fecha_entrada || !registrado_por) {
      return Response.json({
        success: false,
        message: 'Campos requeridos: producto, cantidad, precio, fecha de entrada y registrado por'
      }, { status: 400 });
    }

    if (cantidad <= 0) {
      return Response.json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      }, { status: 400 });
    }

    const connection = await connectDB();

    // Insertar entrada
    const [result] = await connection.execute(
      `INSERT INTO entradas_inventario 
       (producto_id, proveedor_id, cantidad, precio_unitario, numero_lote, 
        fecha_entrada, fecha_caducidad, recibido_por, registrado_por, observaciones, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        producto_id,
        proveedor_id || null,
        cantidad,
        precio_unitario,
        numero_lote || null,
        fecha_entrada,
        fecha_caducidad || null,
        recibido_por || null,
        registrado_por,
        observaciones || null
      ]
    );

    // Actualizar stock del producto
    await connection.execute(
      `UPDATE productos 
       SET stock_actual = stock_actual + ?, 
           fecha_actualizacion = NOW()
       WHERE id = ?`,
      [cantidad, producto_id]
    );

    // Registrar auditoría
    await connection.execute(
      `INSERT INTO auditoria_inventario 
       (usuario_id, accion, tabla_afectada, registro_id, detalles, fecha_auditoria)
       VALUES (?, 'INSERT', 'entradas_inventario', ?, ?, NOW())`,
      [
        registrado_por,
        result.insertId,
        `Entrada de ${cantidad} unidades del producto ${producto_id}`
      ]
    );

    return Response.json({
      success: true,
      message: 'Entrada registrada exitosamente',
      data: { id: result.insertId }
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST entradas:', error);
    return Response.json({
      success: false,
      message: 'Error al registrar entrada: ' + error.message
    }, { status: 500 });
  }
}