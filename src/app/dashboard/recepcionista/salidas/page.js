'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './salidas.module.css';
import { useAuth } from '@/app/context/AuthContext';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import dynamic from 'next/dynamic';

function SalidasContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    producto_id: '',
    cantidad: '',
    tipo_salida: 'venta',
    destino: '',
    precio_unitario: '',
    responsable: '',
    observaciones: '',
    fecha_salida: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recepcionista');
      const data = await response.json();
      
      if (data.success) {
        setProductos(data.data.productos);
        setUsuarios(data.data.usuarios);
        setSalidas(data.data.salidas);
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

  const validateForm = () => {
    const errors = {};

    if (!formData.producto_id) {
      errors.producto_id = 'Debe seleccionar un producto';
    }

    if (!formData.cantidad || formData.cantidad === '') {
      errors.cantidad = 'La cantidad es requerida';
    } else if (parseInt(formData.cantidad) <= 0) {
      errors.cantidad = 'La cantidad debe ser mayor a 0';
    } else if (selectedProduct && parseInt(formData.cantidad) > selectedProduct.stock_actual) {
      errors.cantidad = `Stock insuficiente. Solo hay ${selectedProduct.stock_actual} unidades disponibles`;
    }

    if (!formData.fecha_salida) {
      errors.fecha_salida = 'La fecha de salida es requerida';
    }

    if (!formData.tipo_salida) {
      errors.tipo_salida = 'El tipo de salida es requerido';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
        precio_unitario: producto ? producto.precio_venta : ''
      }));
    } else if (name === 'cantidad') {
      if (selectedProduct && value && parseInt(value) > selectedProduct.stock_actual) {
        setValidationErrors(prev => ({
          ...prev,
          cantidad: `Stock insuficiente. Solo hay ${selectedProduct.stock_actual} unidades disponibles`
        }));
      } else if (validationErrors.cantidad) {
        setValidationErrors(prev => ({
          ...prev,
          cantidad: ''
        }));
      }
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePrecioChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      precio_unitario: value
    }));
  };

  const getTipoSalidaText = (tipo) => {
    switch (tipo) {
      case 'venta':
        return 'Venta';
      case 'consumo_interno':
        return 'Consumo Interno';
      case 'ajuste':
        return 'Ajuste';
      case 'danado':
        return 'Dañado';
      default:
        return tipo;
    }
  };

  const getTipoSalidaBadge = (tipo) => {
    switch (tipo) {
      case 'venta':
        return { class: styles.badgeVenta, text: 'Venta' };
      case 'consumo_interno':
        return { class: styles.badgeConsumo, text: 'Consumo Interno' };
      case 'ajuste':
        return { class: styles.badgeAjuste, text: 'Ajuste' };
      case 'danado':
        return { class: styles.badgeDanado, text: 'Dañado' };
      default:
        return { class: styles.badgeVenta, text: tipo };
    }
  };

  // Función para exportar a PDF
const exportarPDF = async () => {
  setExportingPDF(true);
  
  try {
    // Importar jsPDF y autoTable correctamente
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Salidas de Inventario', 14, 20);

    // Información del usuario y fecha
    doc.setFontSize(10);
    doc.text(`Generado por: ${user?.nombre}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 36);
    doc.text(`Total de registros: ${salidas.length}`, 14, 42);

    // Preparar datos para la tabla
    const tableData = salidas.map((salida) => [
      new Date(salida.fecha_salida).toLocaleDateString('es-ES'),
      `${salida.producto_nombre}\n${salida.producto_marca}`,
      getTipoSalidaText(salida.tipo_salida),
      salida.cantidad.toString(),
      salida.precio_unitario ? `$${parseFloat(salida.precio_unitario).toFixed(2)}` : 'N/A',
      salida.destino || 'N/A'
    ]);

    // Generar tabla usando autoTable directamente
    autoTable(doc, {
      head: [['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Precio Unit.', 'Destino']],
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
        1: { cellWidth: 55 },
        2: { cellWidth: 30 },
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
    const fileName = `salidas_inventario_${new Date().toISOString().split('T')[0]}.pdf`;
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

    if (!validateForm()) {
      setSubmitting(false);
      setMessage({ type: 'error', text: 'Por favor corrige los errores en el formulario' });
      return;
    }

    try {
      const response = await fetch('/api/recepcionista', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          registrado_por: user.id,
          cantidad: parseInt(formData.cantidad),
          precio_unitario: formData.precio_unitario ? parseFloat(formData.precio_unitario) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Salida registrada exitosamente' });
        
        setFormData({
          producto_id: '',
          cantidad: '',
          tipo_salida: 'venta',
          destino: '',
          precio_unitario: '',
          responsable: '',
          observaciones: '',
          fecha_salida: new Date().toISOString().split('T')[0]
        });
        setSelectedProduct(null);
        setValidationErrors({});

        await cargarDatos();

        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al registrar salida' });
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
              onClick={() => router.push('/dashboard/recepcionista')}
              className={styles.backButton}
            >
              ← Volver
            </button>
            <h1>Registro de Salidas/Ventas</h1>
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
            <h2>📤 Nueva Salida de Inventario</h2>
            
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
                  <label htmlFor="tipo_salida">Tipo de Salida *</label>
                  <select
                    id="tipo_salida"
                    name="tipo_salida"
                    value={formData.tipo_salida}
                    onChange={handleChange}
                    required
                    className={`${styles.select} ${validationErrors.tipo_salida ? styles.inputError : ''}`}
                  >
                    <option value="venta">Venta</option>
                    <option value="consumo_interno">Consumo Interno</option>
                    <option value="ajuste">Ajuste de Inventario</option>
                    <option value="danado">Producto Dañado</option>
                  </select>
                  {validationErrors.tipo_salida && (
                    <span className={styles.errorText}>{validationErrors.tipo_salida}</span>
                  )}
                </div>
              </div>

              {selectedProduct && (
                <div className={styles.stockInfo}>
                  <p>
                    <strong>Stock disponible:</strong> {selectedProduct.stock_actual} unidades | 
                    <strong> Precio de venta sugerido:</strong> ${parseFloat(selectedProduct.precio_venta).toFixed(2)}
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
                    max={selectedProduct ? selectedProduct.stock_actual : ''}
                    className={`${styles.input} ${validationErrors.cantidad ? styles.inputError : ''}`}
                    placeholder="Ingrese cantidad"
                  />
                  {validationErrors.cantidad && (
                    <span className={styles.errorText}>{validationErrors.cantidad}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="precio_unitario">Precio Unitario</label>
                  <input
                    type="number"
                    id="precio_unitario"
                    name="precio_unitario"
                    value={formData.precio_unitario}
                    onChange={handlePrecioChange}
                    min="0"
                    step="0.01"
                    className={styles.input}
                    placeholder="0.00"
                  />
                  {selectedProduct && (
                    <small className={styles.helpText}>
                      Precio sugerido: ${parseFloat(selectedProduct.precio_venta).toFixed(2)}
                    </small>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fecha_salida">Fecha de Salida *</label>
                  <input
                    type="date"
                    id="fecha_salida"
                    name="fecha_salida"
                    value={formData.fecha_salida}
                    onChange={handleChange}
                    required
                    className={`${styles.input} ${validationErrors.fecha_salida ? styles.inputError : ''}`}
                  />
                  {validationErrors.fecha_salida && (
                    <span className={styles.errorText}>{validationErrors.fecha_salida}</span>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="destino">Destino/Cliente</label>
                  <input
                    type="text"
                    id="destino"
                    name="destino"
                    value={formData.destino}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Nombre del cliente o destino"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="responsable">Responsable</label>
                  <select
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">Seleccionar responsable</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre}
                      </option>
                    ))}
                  </select>
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
                  placeholder="Notas adicionales sobre esta salida..."
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/recepcionista')}
                  className={styles.buttonSecondary}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.buttonPrimary}
                >
                  {submitting ? 'Registrando...' : 'Registrar Salida'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.historySection}>
          <div className={styles.card}>
            <div className={styles.tableHeader}>
              <h2>📋 Salidas Recientes</h2>
              <button 
                onClick={exportarPDF} 
                disabled={exportingPDF || salidas.length === 0}
                className={styles.pdfButton}
              >
                {exportingPDF ? '⏳ Generando...' : '📄 Descargar PDF'}
              </button>
            </div>
            {salidas.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salidas.map((salida) => {
                      const badge = getTipoSalidaBadge(salida.tipo_salida);
                      return (
                        <tr key={salida.id}>
                          <td>
                            {new Date(salida.fecha_salida).toLocaleDateString('es-ES')}
                          </td>
                          <td>
                            <div className={styles.productInfo}>
                              <strong>{salida.producto_nombre}</strong>
                              <small>{salida.producto_marca}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${badge.class}`}>
                              {badge.text}
                            </span>
                          </td>
                          <td>
                            <strong>{salida.cantidad}</strong>
                          </td>
                          <td>
                            {salida.precio_unitario ? `$${parseFloat(salida.precio_unitario).toFixed(2)}` : 'N/A'}
                          </td>
                          <td>
                            <small>{salida.destino || 'N/A'}</small>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No hay salidas registradas</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SalidasPage() {
  return (
    <ProtectedRoute requiredRole="inventario">
      <SalidasContent />
    </ProtectedRoute>
  );
}