'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './entradas.module.css';
import { useAuth } from '@/app/context/AuthContext';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

function EntradasContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    producto_id: '',
    proveedor_id: '',
    cantidad: '',
    precio_unitario: '',
    numero_lote: '',
    fecha_entrada: new Date().toISOString().split('T')[0],
    fecha_caducidad: '',
    recibido_por: '',
    observaciones: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bodega/entradas');
      const data = await response.json();
      
      if (data.success) {
        setProductos(data.data.productos);
        setProveedores(data.data.proveedores);
        setEntradas(data.data.entradas);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMessage({ type: 'error', text: 'Error al cargar datos' });
    } finally {
      setLoading(false);
    }
  };

  // Validación del formulario
  const validateForm = () => {
    const errors = {};

    if (!formData.producto_id) {
      errors.producto_id = 'Debe seleccionar un producto';
    }

    if (!formData.cantidad || formData.cantidad === '') {
      errors.cantidad = 'La cantidad es requerida';
    } else if (parseInt(formData.cantidad) <= 0) {
      errors.cantidad = 'La cantidad debe ser mayor a 0';
    }

    if (!formData.precio_unitario || formData.precio_unitario === '') {
      errors.precio_unitario = 'El precio unitario es requerido';
    } else if (parseFloat(formData.precio_unitario) < 0) {
      errors.precio_unitario = 'El precio no puede ser negativo';
    }

    if (!formData.fecha_entrada) {
      errors.fecha_entrada = 'La fecha de entrada es requerida';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Limpiar errores de validación cuando el usuario escribe
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (name === 'producto_id') {
      const producto = productos.find(p => p.id === parseInt(value));
      setSelectedProduct(producto);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        precio_unitario: producto && producto.precio_compra ? producto.precio_compra.toString() : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Función para exportar a PDF
  const exportarPDF = async () => {
    setExportingPDF(true);
    
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();

      // Título
      doc.setFontSize(18);
      doc.text('Reporte de Entradas de Inventario', 14, 20);

      // Información del usuario y fecha
      doc.setFontSize(10);
      doc.text(`Generado por: ${user?.nombre}`, 14, 30);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 36);
      doc.text(`Total de registros: ${entradas.length}`, 14, 42);

      // Preparar datos para la tabla
      const tableData = entradas.map((entrada) => [
        new Date(entrada.fecha_entrada).toLocaleDateString('es-ES'),
        `${entrada.producto_nombre}\n${entrada.producto_marca}`,
        entrada.proveedor_nombre || 'N/A',
        entrada.cantidad.toString(),
        `$${parseFloat(entrada.precio_unitario).toFixed(2)}`,
        entrada.numero_lote || 'N/A'
      ]);

      // Generar tabla
      autoTable(doc, {
        head: [['Fecha', 'Producto', 'Proveedor', 'Cantidad', 'Precio Unit.', 'Lote']],
        body: tableData,
        startY: 50,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [0, 112, 243],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 },
        },
      });

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Descargar el PDF
      const fileName = `entradas_inventario_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setMessage({ type: 'success', text: 'PDF generado exitosamente' });
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Error generando PDF:', error);
      setMessage({ type: 'error', text: 'Error al generar el PDF' });
    } finally {
      setExportingPDF(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Validar formulario antes de enviar
    if (!validateForm()) {
      setSubmitting(false);
      setMessage({ type: 'error', text: 'Por favor corrige los errores en el formulario' });
      return;
    }

    try {
      const response = await fetch('/api/bodega/entradas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          registrado_por: user.id,
          cantidad: parseInt(formData.cantidad),
          precio_unitario: parseFloat(formData.precio_unitario)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Entrada registrada exitosamente' });
        
        // Limpiar formulario
        setFormData({
          producto_id: '',
          proveedor_id: '',
          cantidad: '',
          precio_unitario: '',
          numero_lote: '',
          fecha_entrada: new Date().toISOString().split('T')[0],
          fecha_caducidad: '',
          recibido_por: '',
          observaciones: ''
        });
        setSelectedProduct(null);
        setValidationErrors({});

        // Recargar datos
        await cargarDatos();

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al registrar entrada' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button 
              onClick={() => router.push('/dashboard/bodega')}
              className={styles.backButton}
            >
              ← Volver
            </button>
            <h1>Registro de Entradas</h1>
          </div>
          <div className={styles.userInfo}>
            <span>Bienvenido, {user?.nombre}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.formSection}>
          <div className={styles.card}>
            <h2>📥 Nueva Entrada de Inventario</h2>
            
            {message.text && (
              <div className={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="producto_id">Producto *</label>
                  <select
                    id="producto_id"
                    name="producto_id"
                    value={formData.producto_id}
                    onChange={handleChange}
                    required
                    className={`${styles.select} ${validationErrors.producto_id ? styles.inputError : ''}`}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map(producto => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} - {producto.marca} (Stock: {producto.stock_actual})
                      </option>
                    ))}
                  </select>
                  {validationErrors.producto_id && (
                    <span className={styles.errorText}>{validationErrors.producto_id}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="proveedor_id">Proveedor</label>
                  <select
                    id="proveedor_id"
                    name="proveedor_id"
                    value={formData.proveedor_id}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">Seleccionar proveedor (opcional)</option>
                    {proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} - {proveedor.contacto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProduct && (
                <div className={styles.stockInfo}>
                  <p>
                    <strong>Stock actual:</strong> {selectedProduct.stock_actual} unidades | 
                    <strong> Precio de compra sugerido:</strong> ${parseFloat(selectedProduct.precio_compra).toFixed(2)}
                  </p>
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="cantidad">Cantidad *</label>
                  <input
                    type="number"
                    id="cantidad"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleChange}
                    required
                    min="1"
                    className={`${styles.input} ${validationErrors.cantidad ? styles.inputError : ''}`}
                    placeholder="Ingrese cantidad"
                  />
                  {validationErrors.cantidad && (
                    <span className={styles.errorText}>{validationErrors.cantidad}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="precio_unitario">Precio Unitario *</label>
                  <input
                    type="number"
                    id="precio_unitario"
                    name="precio_unitario"
                    value={formData.precio_unitario}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className={`${styles.input} ${validationErrors.precio_unitario ? styles.inputError : ''}`}
                    placeholder="0.00"
                  />
                  {selectedProduct && (
                    <small className={styles.helpText}>
                      Precio sugerido: ${parseFloat(selectedProduct.precio_compra).toFixed(2)}
                    </small>
                  )}
                  {validationErrors.precio_unitario && (
                    <span className={styles.errorText}>{validationErrors.precio_unitario}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="numero_lote">Número de Lote</label>
                  <input
                    type="text"
                    id="numero_lote"
                    name="numero_lote"
                    value={formData.numero_lote}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Ej: LOTE-2025-001"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="fecha_entrada">Fecha de Entrada *</label>
                  <input
                    type="date"
                    id="fecha_entrada"
                    name="fecha_entrada"
                    value={formData.fecha_entrada}
                    onChange={handleChange}
                    required
                    className={`${styles.input} ${validationErrors.fecha_entrada ? styles.inputError : ''}`}
                  />
                  {validationErrors.fecha_entrada && (
                    <span className={styles.errorText}>{validationErrors.fecha_entrada}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fecha_caducidad">Fecha de Caducidad</label>
                  <input
                    type="date"
                    id="fecha_caducidad"
                    name="fecha_caducidad"
                    value={formData.fecha_caducidad}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="recibido_por">Recibido Por</label>
                  <input
                    type="text"
                    id="recibido_por"
                    name="recibido_por"
                    value={formData.recibido_por}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Nombre de quien recibió"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="observaciones">Observaciones</label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows="3"
                  placeholder="Notas adicionales sobre esta entrada..."
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/bodega')}
                  className={styles.buttonSecondary}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.buttonPrimary}
                >
                  {submitting ? 'Registrando...' : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.historySection}>
          <div className={styles.card}>
            <div className={styles.tableHeader}>
              <h2>📋 Entradas Recientes</h2>
              <button 
                onClick={exportarPDF} 
                disabled={exportingPDF || entradas.length === 0}
                className={styles.pdfButton}
              >
                {exportingPDF ? '⏳ Generando...' : '📄 Descargar PDF'}
              </button>
            </div>
            {entradas.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Proveedor</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.map((entrada) => (
                      <tr key={entrada.id}>
                        <td>
                          {new Date(entrada.fecha_entrada).toLocaleDateString('es-ES')}
                        </td>
                        <td>
                          <div className={styles.productInfo}>
                            <strong>{entrada.producto_nombre}</strong>
                            <small>{entrada.producto_marca}</small>
                          </div>
                        </td>
                        <td>{entrada.proveedor_nombre || 'N/A'}</td>
                        <td>
                          <span className={styles.badge}>{entrada.cantidad}</span>
                        </td>
                        <td>${parseFloat(entrada.precio_unitario).toFixed(2)}</td>
                        <td>
                          <small>{entrada.numero_lote || 'N/A'}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No hay entradas registradas</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EntradasPage() {
  return (
    <ProtectedRoute requiredRole="bodega">
      <EntradasContent />
    </ProtectedRoute>
  );
}