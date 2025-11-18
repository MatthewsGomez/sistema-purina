import { connectDB } from '@/app/lib/db';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email y contraseña son requeridos' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let connection;
    try {
      connection = await connectDB();
    } catch (dbError) {
      console.error('Error conectando a la BD:', dbError);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Error de conexión con la base de datos' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const [users] = await connection.execute(
      'SELECT id, nombre, email, password, rol, activo FROM usuarios WHERE email = ? AND activo = 1',
      [email]
    );

    if (users.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Usuario no encontrado o inactivo' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = users[0];

    if (password !== user.password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Contraseña incorrecta' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Login exitoso',
      user: userWithoutPassword
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Error del servidor: ' + error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}