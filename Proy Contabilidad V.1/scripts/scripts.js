/**
 * ContApp — Sistema Contable Modular Integrado
 * Soporta: Libro Diario, Análisis de Op., Balanza de Comprobación y Estado de Resultados.
 */

// 1. ESTADO GLOBAL DE LA APLICACIÓN (Datos persistentes)
const ContApp = {
  asientos: JSON.parse(localStorage.getItem('contapp_asientos')) || [],
  // Guardamos también el inventario final y encabezados para que persistan entre páginas
  inventarioFinal: parseFloat(localStorage.getItem('contapp_inv_final')) || 0,
  empresa: localStorage.getItem('contapp_empresa') || '',
  periodo: localStorage.getItem('contapp_periodo') || '',
  
  guardarDatos: function() {
    localStorage.setItem('contapp_asientos', JSON.stringify(this.asientos));
    localStorage.setItem('contapp_inv_final', this.inventarioFinal);
    localStorage.setItem('contapp_empresa', this.empresa);
    localStorage.setItem('contapp_periodo', this.periodo);
  }
};

// 2. MOTOR DE CÁLCULO (Funciones puras matemáticas)
const ContCalcular = {
  totalDebe: function() {
    return ContApp.asientos
      .filter(a => a.tipo === 'debe')
      .reduce((sum, a) => sum + a.monto, 0);
  },
  
  totalHaber: function() {
    return ContApp.asientos
      .filter(a => a.tipo === 'haber')
      .reduce((sum, a) => sum + a.monto, 0);
  },
  
  estaCuadrado: function() {
    const debe = this.totalDebe();
    const haber = this.totalHaber();
    return ContApp.asientos.length > 0 && Math.abs(debe - haber) < 0.01;
  },

  obtenerTotalesPorCuenta: function() {
    const resumen = {};
    ContApp.asientos.forEach(asiento => {
      if (!resumen[asiento.cuenta]) {
        resumen[asiento.cuenta] = { debe: 0, haber: 0 };
      }
      if (asiento.tipo === 'debe') {
        resumen[asiento.cuenta].debe += asiento.monto;
      } else if (asiento.tipo === 'haber') {
        resumen[asiento.cuenta].haber += asiento.monto;
      }
    });
    return resumen;
  },

  obtenerSaldoCuenta: function(nombreCuenta, tipo = 'neto') {
    const cuentas = this.obtenerTotalesPorCuenta();
    const datos = cuentas[nombreCuenta] || { debe: 0, haber: 0 };
    
    if (tipo === 'debe') return datos.debe;
    if (tipo === 'haber') return datos.haber;
    return Math.abs(datos.debe - datos.haber);
  }
};

// 3. ENRUTADOR Y CONTROLADOR DE VISTAS (Detecta la página actual)
document.addEventListener('DOMContentLoaded', () => {
  ControladorNavegacion.inicializarEnlaces();

  // Vista: Libro Diario
  if (document.getElementById('entriesTbody')) {
    ModuloLibroDiario.inicializar();
  }
  
  // Vista: Análisis de Operación
  if (document.getElementById('ventasBrutas')) {
    ModuloAnalisisOperacion.inicializar();
  }

  // Vista: Balanza de Comprobación
  if (document.getElementById('balanzaBody')) {
    ModuloBalanzaComprobacion.inicializar();
  }

  // Vista: Estado de Resultados
  if (document.getElementById('er-ventasNetas')) {
    ModuloEstadoResultados.inicializar();
  }
});

// 4. LÓGICA DEL LIBRO DIARIO
const ModuloLibroDiario = {
  inicializar: function() {
    const exampleBtn = document.getElementById('loadExampleBtn');
    if (exampleBtn) exampleBtn.remove(); 

    document.getElementById('addEntryBtn').addEventListener('click', () => this.agregarAsiento());
    document.getElementById('clearAllBtn').addEventListener('click', () => this.limpiarTodo());
    
    this.renderizarTodo();
  },

  agregarAsiento: function() {
    const inputCuenta = document.getElementById('accountName');
    const inputMonto = document.getElementById('amount');
    const selectTipo = document.getElementById('entryType');

    const cuenta = inputCuenta.value.trim();
    const monto = parseFloat(inputMonto.value);
    const tipo = selectTipo.value;

    if (!cuenta) return alert('Por favor, introduce o selecciona una cuenta contable.');
    if (isNaN(monto) || monto <= 0) return alert('Por favor, introduce un monto válido mayor a 0.');

    const nuevoAsiento = {
      id: Date.now(),
      cuenta: cuenta,
      monto: monto,
      tipo: tipo
    };

    ContApp.asientos.push(nuevoAsiento);
    ContApp.guardarDatos();

    inputCuenta.value = '';
    inputMonto.value = '';

    this.renderizarTodo();
    ControladorNavegacion.inicializarEnlaces();
  },

  eliminarAsiento: function(id) {
    ContApp.asientos = ContApp.asientos.filter(a => a.id !== id);
    ContApp.guardarDatos();
    
    this.renderizarTodo();
    ControladorNavegacion.inicializarEnlaces();
  },

  limpiarTodo: function() {
    if (confirm('¿Estás seguro de que deseas borrar todos los asientos registrados?')) {
      ContApp.asientos = [];
      ContApp.inventarioFinal = 0;
      ContApp.empresa = '';
      ContApp.periodo = '';
      ContApp.guardarDatos();
      this.renderizarTodo();
      ControladorNavegacion.inicializarEnlaces();
    }
  },

  renderizarTodo: function() {
    const tbodyDiario = document.getElementById('entriesTbody');
    tbodyDiario.innerHTML = ''; 

    ContApp.asientos.forEach((asiento, index) => {
      const tr = document.createElement('tr');
      const celdaDebe = asiento.tipo === 'debe' ? `$${asiento.monto.toFixed(2)}` : '-';
      const celdaHaber = asiento.tipo === 'haber' ? `$${asiento.monto.toFixed(2)}` : '-';
      const claseMonto = asiento.tipo === 'debe' ? 'num-debit' : 'num-credit';

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${asiento.cuenta}</strong></td>
        <td class="${asiento.tipo === 'debe' ? claseMonto : ''}">${celdaDebe}</td>
        <td class="${asiento.tipo === 'haber' ? claseMonto : ''}">${celdaHaber}</td>
        <td>
          <button class="delete-entry-btn" onclick="ModuloLibroDiario.eliminarAsiento(${asiento.id})">✕</button>
        </td>
      `;
      tbodyDiario.appendChild(tr);
    });

    const tbodyMayor = document.getElementById('summaryBody');
    if (tbodyMayor) {
      tbodyMayor.innerHTML = '';
      const cuentasAgrupadas = ContCalcular.obtenerTotalesPorCuenta();

      Object.keys(cuentasAgrupadas).forEach(nombreCuenta => {
        const totales = cuentasAgrupadas[nombreCuenta];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${nombreCuenta}</strong></td>
          <td style="text-align:right;" class="num-debit">$${totales.debe.toFixed(2)}</td>
          <td style="text-align:right;" class="num-credit">$${totales.haber.toFixed(2)}</td>
        `;
        tbodyMayor.appendChild(tr);
      });
    }

    document.getElementById('kpiAsientos').innerText = ContApp.asientos.length;
    document.getElementById('kpiDebe').innerText = `$${ContCalcular.totalDebe().toFixed(2)}`;
    document.getElementById('kpiHaber').innerText = `$${ContCalcular.totalHaber().toFixed(2)}`;

    const warningDiv = document.getElementById('balanceWarning');
    if (ContApp.asientos.length > 0 && !ContCalcular.estaCuadrado()) {
      warningDiv.style.display = 'block';
      warningDiv.innerText = `⚠️ El Libro Diario no está cuadrado. Diferencia: $${Math.abs(ContCalcular.totalDebe() - ContCalcular.totalHaber()).toFixed(2)}`;
    } else {
      warningDiv.style.display = 'none';
    }
  }
};

// 5. LÓGICA DEL ANÁLISIS DE OPERACIÓN
const ModuloAnalisisOperacion = {
  inicializar: function() {
    const inputInvFinal = document.getElementById('inventarioFinal');
    
    // Asignar el valor que ya teníamos guardado si existe
    inputInvFinal.value = ContApp.inventarioFinal || '';
    
    inputInvFinal.addEventListener('input', () => {
      // Guardar dinámicamente el conteo físico en el estado de la app
      ContApp.inventarioFinal = parseFloat(inputInvFinal.value) || 0;
      ContApp.guardarDatos();
      this.calcularYRenderizar();
    });
    
    this.calcularYRenderizar();
  },

  calcularYRenderizar: function() {
    const ventasBrutas = ContCalcular.obtenerSaldoCuenta('Ventas', 'haber');
    const devVentas    = ContCalcular.obtenerSaldoCuenta('Devoluciones s/ventas', 'debe');
    const descVentas   = ContCalcular.obtenerSaldoCuenta('Descuentos s/ventas', 'debe');
    
    const comprasBrutas = ContCalcular.obtenerSaldoCuenta('Compras', 'debe');
    const gastosCompra  = ContCalcular.obtenerSaldoCuenta('Gastos de compra', 'debe');
    const devCompras    = ContCalcular.obtenerSaldoCuenta('Devoluciones s/compras', 'haber');
    const descCompras   = ContCalcular.obtenerSaldoCuenta('Descuentos s/compras', 'haber');
    
    const inventarioInicial = ContCalcular.obtenerSaldoCuenta('Inventario inicial', 'debe');
    const inventarioFinal   = ContApp.inventarioFinal;

    const ventasNetas   = ventasBrutas - (devVentas + descVentas);
    const comprasTotales = comprasBrutas + gastosCompra;
    const comprasNetas   = comprasTotales - (devCompras + descCompras);
    const totalMercancia = inventarioInicial + comprasNetas;
    const costoVendido   = totalMercancia - inventarioFinal;
    const utilidadBruta  = ventasNetas - costoVendido;

    document.getElementById('ventasBrutas').innerText = ventasBrutas.toFixed(2);
    document.getElementById('devVentas').innerText    = devVentas.toFixed(2);
    document.getElementById('descVentas').innerText   = descVentas.toFixed(2);
    document.getElementById('ventasNetas').innerText  = ventasNetas.toFixed(2);

    document.getElementById('comprasBrutas').innerText = comprasBrutas.toFixed(2);
    document.getElementById('gastosCompra').innerText  = gastosCompra.toFixed(2);
    document.getElementById('devCompras').innerText    = devCompras.toFixed(2);
    document.getElementById('descCompras').innerText   = descCompras.toFixed(2);
    document.getElementById('comprasNetas').innerText  = comprasNetas.toFixed(2);

    document.getElementById('inventarioInicial').innerText = inventarioInicial.toFixed(2);
    document.getElementById('comprasNetasB').innerText     = comprasNetas.toFixed(2);
    document.getElementById('totalMercancia').innerText    = totalMercancia.toFixed(2);
    document.getElementById('costoVendido').innerText      = costoVendido.toFixed(2);

    const utilidadBox = document.getElementById('utilidadBox');
    const utilidadLabel = utilidadBox.querySelector('.utilidad-label');
    document.getElementById('utilidadBruta').innerText = `$${utilidadBruta.toFixed(2)}`;

    if (utilidadBruta < 0) {
      utilidadBox.classList.add('perdida');
      utilidadLabel.innerText = "Pérdida Bruta";
    } else {
      utilidadBox.classList.remove('perdida');
      utilidadLabel.innerText = "Utilidad Bruta";
    }

    this.renderizarFormulasExtras(ventasNetas, costoVendido, utilidadBruta);
  },

  renderizarFormulasExtras: function(ventasNetas, costoVendido, utilidadBruta) {
    let extraContainer = document.getElementById('analisisRatiosExtras');
    if (!extraContainer) {
      extraContainer = document.createElement('div');
      extraContainer.id = 'analisisRatiosExtras';
      extraContainer.className = 'metric-section';
      const utilidadBox = document.getElementById('utilidadBox');
      utilidadBox.parentNode.insertBefore(extraContainer, utilidadBox);
    }

    const margenBrutoPct = ventasNetas > 0 ? (utilidadBruta / ventasNetas) * 100 : 0;
    const costoVendidoPct = ventasNetas > 0 ? (costoVendido / ventasNetas) * 100 : 0;

    const alertaStock = costoVendido < 0 
      ? `<div style="color:var(--credit); font-size:0.8rem; font-weight:600; margin-top:8px;">⚠️ Alerta: El costo de ventas es negativo. Revisa si el Inventario Final físico es excesivo.</div>` 
      : '';

    extraContainer.innerHTML = `
      <div class="metric-section-label">Indicadores de Gestión Contable</div>
      <div class="metric">
        <span>Margen de Utilidad Bruta</span>
        <strong style="color:${utilidadBruta >= 0 ? 'var(--debit)' : 'var(--credit)'}">${margenBrutoPct.toFixed(2)}%</strong>
      </div>
      <div class="metric">
        <span>Proporción del Costo de Venta</span>
        <strong style="color:var(--primary)">${costoVendidoPct.toFixed(2)}%</strong>
      </div>
      ${alertaStock}
    `;
  }
};

// 6. LÓGICA DE LA BALANZA DE COMPROBACIÓN
const ModuloBalanzaComprobacion = {
  inicializar: function() {
    const printBtn = document.getElementById('printBalanzaBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
    this.renderizarBalanza();
  },

  renderizarBalanza: function() {
    const tbody = document.getElementById('balanzaBody');
    if (!tbody) return;

    tbody.innerHTML = ''; 
    const cuentasAgrupadas = ContCalcular.obtenerTotalesPorCuenta();

    let sumMovDebe = 0; let sumMovHaber = 0;
    let sumSalDeudor = 0; let sumSalAcreedor = 0;

    Object.keys(cuentasAgrupadas).forEach(nombreCuenta => {
      const movimientos = cuentasAgrupadas[nombreCuenta];
      let saldoDeudor = 0; let saldoAcreedor = 0;

      if (movimientos.debe >= movimientos.haber) {
        saldoDeudor = movimientos.debe - movimientos.haber;
      } else {
        saldoAcreedor = movimientos.haber - movimientos.debe;
      }

      sumMovDebe += movimientos.debe;
      sumMovHaber += movimientos.haber;
      sumSalDeudor += saldoDeudor;
      sumSalAcreedor += saldoAcreedor;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${nombreCuenta}</strong></td>
        <td style="text-align:right;">$${movimientos.debe.toFixed(2)}</td>
        <td style="text-align:right;">$${movimientos.haber.toFixed(2)}</td>
        <td style="text-align:right;" class="${saldoDeudor > 0 ? 'num-debit' : ''}">$${saldoDeudor.toFixed(2)}</td>
        <td style="text-align:right;" class="${saldoAcreedor > 0 ? 'num-credit' : ''}">$${saldoAcreedor.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });

    const tfoot = tbody.closest('table').querySelector('tfoot') || document.createElement('tfoot');
    tfoot.innerHTML = `
      <tr style="font-weight: 700; background: var(--bg-app); border-top: 2px solid var(--border);">
        <td>TOTALES</td>
        <td style="text-align:right;">$${sumMovDebe.toFixed(2)}</td>
        <td style="text-align:right;">$${sumMovHaber.toFixed(2)}</td>
        <td style="text-align:right; color:var(--debit);">$${sumSalDeudor.toFixed(2)}</td>
        <td style="text-align:right; color:var(--credit);">$${sumSalAcreedor.toFixed(2)}</td>
      </tr>
    `;
    if (!tbody.closest('table').querySelector('tfoot')) {
      tbody.closest('table').appendChild(tfoot);
    }

    const badge = document.getElementById('balanzaBadge');
    if (badge) {
      const movimientosCuadrados = Math.abs(sumMovDebe - sumMovHaber) < 0.01;
      const saldosCuadrados = Math.abs(sumSalDeudor - sumSalAcreedor) < 0.01;

      if (movimientosCuadrados && saldosCuadrados && sumMovDebe > 0) {
        badge.className = "status-badge status-success";
        badge.innerText = "✓ Balanza Cuadrada";
      } else {
        badge.className = "status-badge status-warning";
        badge.innerText = "⚠️ Descuadrada";
      }
    }
  }
};

// 7. NUEVO — LÓGICA EXCLUSIVA DEL ESTADO DE RESULTADOS
const ModuloEstadoResultados = {
  inicializar: function() {
    // Escuchar inputs de texto de los membretes del documento formal
    const inputEmpresa = document.getElementById('empresaName') || document.querySelector('input[placeholder*="Empresa"]');
    const inputPeriodo = document.getElementById('periodoTexto') || document.querySelector('input[placeholder*="Período"]');
    
    if (inputEmpresa) {
      inputEmpresa.value = ContApp.empresa;
      inputEmpresa.addEventListener('input', () => {
        ContApp.empresa = inputEmpresa.value;
        ContApp.guardarDatos();
      });
    }

    if (inputPeriodo) {
      inputPeriodo.value = ContApp.periodo;
      inputPeriodo.addEventListener('input', () => {
        ContApp.periodo = inputPeriodo.value;
        ContApp.guardarDatos();
      });
    }

    // Vincular acción de impresión
    const printBtn = document.getElementById('printEstadoBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }

    this.renderizarReporteFormal();
  },

  renderizarReporteFormal: function() {
    // 1. Obtener valores idénticos de las cuentas analizadas
    const ventasBrutas = ContCalcular.obtenerSaldoCuenta('Ventas', 'haber');
    const devVentas    = ContCalcular.obtenerSaldoCuenta('Devoluciones s/ventas', 'debe');
    const descVentas   = ContCalcular.obtenerSaldoCuenta('Descuentos s/ventas', 'debe');
    
    const comprasBrutas = ContCalcular.obtenerSaldoCuenta('Compras', 'debe');
    const gastosCompra  = ContCalcular.obtenerSaldoCuenta('Gastos de compra', 'debe');
    const devCompras    = ContCalcular.obtenerSaldoCuenta('Devoluciones s/compras', 'haber');
    const descCompras   = ContCalcular.obtenerSaldoCuenta('Descuentos s/compras', 'haber');
    
    const inventarioInicial = ContCalcular.obtenerSaldoCuenta('Inventario inicial', 'debe');
    const inventarioFinal   = ContApp.inventarioFinal;

    // 2. Operaciones Estándar del Reporte
    const ventasNetas    = ventasBrutas - (devVentas + descVentas);
    const comprasTotales = comprasBrutas + gastosCompra;
    const comprasNetas   = comprasTotales - (devCompras + descCompras);
    const totalMercancia = inventarioInicial + comprasNetas;
    const costoVendido   = totalMercancia - inventarioFinal;
    const utilidadBruta  = ventasNetas - costoVendido;

    // 3. Inyectar dinámicamente en los span correspondientes de resultados.html
    document.getElementById('er-ventasBrutas').innerText = ventasBrutas.toFixed(2);
    document.getElementById('er-devVentas').innerText    = devVentas.toFixed(2);
    document.getElementById('er-descVentas').innerText   = descVentas.toFixed(2);
    document.getElementById('er-ventasNetas').innerText  = ventasNetas.toFixed(2);

    document.getElementById('er-comprasBrutas').innerText = comprasBrutas.toFixed(2);
    document.getElementById('er-gastosCompra').innerText  = gastosCompra.toFixed(2);
    document.getElementById('er-devCompras').innerText    = devCompras.toFixed(2);
    document.getElementById('er-descCompras').innerText   = descCompras.toFixed(2);
    document.getElementById('er-comprasNetas').innerText  = comprasNetas.toFixed(2);

    document.getElementById('er-invInicial').innerText     = inventarioInicial.toFixed(2);
    document.getElementById('er-totalMercancia').innerText = totalMercancia.toFixed(2);
    document.getElementById('er-invFinal').innerText       = inventarioFinal.toFixed(2);
    document.getElementById('er-costoVendido').innerText   = costoVendido.toFixed(2);

    // 4. Estructurar caja final dinámica del reporte
    const lineFinal = document.getElementById('er-utilidadFinal') || document.querySelector('.total-final');
    if (lineFinal) {
      const labelSpan = lineFinal.querySelector('span:first-child') || lineFinal;
      const valueSpan = document.getElementById('er-utilidadBruta') || lineFinal.querySelector('span:last-child');
      
      valueSpan.innerText = `$${utilidadBruta.toFixed(2)}`;

      if (utilidadBruta < 0) {
        lineFinal.className = "er-line total-final perdida";
        if(labelSpan !== lineFinal) labelSpan.innerText = "Pérdida Bruta del Ejercicio";
      } else {
        lineFinal.className = "er-line total-final";
        if(labelSpan !== lineFinal) labelSpan.innerText = "Utilidad Bruta del Ejercicio";
      }
    }
  }
};

// 8. CONTROLADOR DE BLOQUEO Y NAVEGACIÓN
const ControladorNavegacion = {
  inicializarEnlaces: function() {
    const enlaces = document.querySelectorAll('.side-nav .nav-item');
    const cuadrado = ContCalcular.estaCuadrado();

    enlaces.forEach(enlace => {
      const destino = enlace.getAttribute('href');

      if (destino !== 'libros.html' && !cuadrado) {
        enlace.style.opacity = '0.4';
        enlace.style.cursor = 'not-allowed';
        enlace.onclick = function(e) {
          e.preventDefault();
          alert('Acceso restringido: El Libro Diario debe poseer asientos registrados y estar perfectamente cuadrado (Debe = Haber) antes de cambiar de sección.');
          return false;
        };
      } else {
        enlace.style.opacity = '1';
        enlace.style.cursor = 'pointer';
        enlace.onclick = null;
      }
    });
  }
};