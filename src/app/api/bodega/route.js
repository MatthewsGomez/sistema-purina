import { connectDB } from '@/app/lib/db';

export async function GET(request) {
  try {
    const connection = await connectDB();

    // Obtener total de productos activos
    const [productsResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM productos WHERE activo = 1'
    );
    const totalProductos = productsResult[0].total;

    // Obtener cantidad de productos con stock bajo
    const [stockBajoResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM productos WHERE stock_actual <= stock_minimo AND stock_actual > 0 AND activo = 1'
    );
    const stockBajo = stockBajoResult[0].total;

    // Obtener entradas del mes (últimos 30 días)
    const [entradasResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM entradas_inventario 
      WHERE DATE(fecha_entrada) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);
    const entradasMes = entradasResult[0].total;

    // Obtener salidas del mes (últimos 30 días)
    const [salidasResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM salidas_inventario 
      WHERE DATE(fecha_salida) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);
    const salidasMes = salidasResult[0].total;

    // Obtener alertas (productos con stock bajo)
    const [alertasResult] = await connection.execute(`
      SELECT 
        p.id,
        p.nombre,
        p.marca,
        p.stock_actual,
        p.stock_minimo,
        (p.stock_minimo - p.stock_actual) as deficit,
        p.ubicacion_bodega
      FROM productos p
      WHERE p.stock_actual <= p.stock_minimo AND p.stock_actual > 0 AND p.activo = 1
      ORDER BY deficit DESC
      LIMIT 10
    `);

    // Obtener lista completa de productos
    const [productosResult] = await connection.execute(`
      SELECT 
        id,
        nombre,
        marca,
        descripcion,
        precio_compra,
        precio_venta,
        stock_actual,
        stock_minimo,
        ubicacion_bodega
      FROM productos
      WHERE activo = 1
      ORDER BY nombre ASC
    `);

    return new Response(JSON.stringify({
      success: true,
      data: {
        estadisticas: {
          totalProductos,
          stockBajo,
          entradasMes,
          salidasMes
        },
        alertas: alertasResult,
        productos: productosResult
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en bodega dashboard:', error.message);
    return new Response(JSON.stringify({
      success: false,
      message: 'Error al cargar el dashboard: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
