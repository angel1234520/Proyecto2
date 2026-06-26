class SistemaContable {
    constructor() {
        // Estado de la Aplicación
        this.cuentas = [];
        this.asientoLineas = [];
        this.asientos = [];
        
        // Inicializar Elementos del DOM y Eventos
        this.initDOM();
        this.initEvents();
        this.renderAll();
    }

    initDOM() {
        // Navegación
        this.pestanas = document.querySelectorAll('.boton-pestana');
        this.secciones = document.querySelectorAll('.seccion');

        // Formularios e Inputs
        this.inputs = {
            cuentaNombre: document.getElementById('cuenta-nombre'),
            cuentaTipo: document.getElementById('cuenta-tipo'),
            cuentaNaturaleza: document.getElementById('cuenta-naturaleza'),
            entradaFecha: document.getElementById('entrada-fecha'),
            entradaDescripcion: document.getElementById('entrada-descripcion'),
            movCuenta: document.getElementById('mov-cuenta'),
            movTipo: document.getElementById('mov-tipo'),
            movMonto: document.getElementById('mov-monto')
        };

        // Contenedores de Listas y Mensajes
        this.ui = {
            mensajeCuenta: document.getElementById('mensaje-cuenta'),
            listaCuentas: document.getElementById('lista-cuentas'),
            listaLineas: document.getElementById('lista-lineas'),
            listaDiario: document.getElementById('lista-diario'),
            mensajeDiario: document.getElementById('mensaje-diario'),
            listaMayor: document.getElementById('lista-mayor'),
            mensajeAsiento: document.getElementById('mensaje-asiento')
        };

        // Totales y Métricas
        this.totales = {
            debe: document.getElementById('total-debe'),
            haber: document.getElementById('total-haber'),
            diferencia: document.getElementById('total-diferencia'),
            resCuentas: document.getElementById('resultado-cuentas'),
            resAsientos: document.getElementById('resultado-asientos'),
            resDebe: document.getElementById('resultado-debe'),
            resHaber: document.getElementById('resultado-haber'),
            resEstado: document.getElementById('resultado-estado')
        };

        this.graficoCanvas = document.getElementById('grafico-mayor');
    }

    initEvents() {
        // Delegación de eventos para Pestañas
        this.pestanas.forEach(boton => {
            boton.addEventListener('click', () => this.manejarNavegacion(boton));
        });

        // Acciones de Cuenta
        document.getElementById('boton-agregar-cuenta').addEventListener('click', () => this.agregarCuenta());
        document.getElementById('boton-limpiar-cuentas').addEventListener('click', () => this.limpiarFormularioCuentas());

        // Acciones de Asientos
        document.getElementById('boton-agregar-linea').addEventListener('click', (e) => {
            e.preventDefault();
            this.agregarLineaAsiento();
        });
        document.getElementById('boton-registrar-asiento').addEventListener('click', () => this.registrarAsiento());
        document.getElementById('boton-limpiar-asiento').addEventListener('click', () => this.limpiarAsiento());
    }

    // --- UTILIDADES ---
    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2
        }).format(valor);
    }

    obtenerSaldoCuenta(cuenta) {
        const saldoBase = cuenta.debe - cuenta.haber;
        return cuenta.naturaleza === 'Acreedora' ? -saldoBase : saldoBase;
    }

    // --- LÓGICA DE NAVEGACIÓN ---
    manejarNavegacion(botonActivo) {
        this.pestanas.forEach(tab => tab.classList.toggle('activa', tab === botonActivo));
        const seccionObjetivo = botonActivo.dataset.seccion;

        this.secciones.forEach(seccion => {
            seccion.classList.toggle('visible', seccion.id === seccionObjetivo);
        });

        // Carga perezosa de vistas específicas al cambiar de pestaña
        if (seccionObjetivo === 'movimientos') this.actualizarOpcionesCuentas();
        if (seccionObjetivo === 'diario') this.mostrarDiario();
        if (seccionObjetivo === 'mayor') this.mostrarMayor();
        if (seccionObjetivo === 'resultados') this.mostrarResultado();
    }

    // --- GESTIÓN DE CUENTAS ---
    agregarCuenta() {
        const nombre = this.inputs.cuentaNombre.value.trim();
        const tipo = this.inputs.cuentaTipo.value;
        const naturaleza = this.inputs.cuentaNaturaleza.value;

        if (!nombre || !tipo || !naturaleza) {
            this.ui.mensajeCuenta.textContent = 'Por favor, complete todos los campos.';
            return;
        }

        if (this.cuentas.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
            this.ui.mensajeCuenta.textContent = 'Esta cuenta ya está registrada.';
            return;
        }

        this.cuentas.push({ nombre, tipo, naturaleza, debe: 0, haber: 0 });
        this.limpiarFormularioCuentas();
        this.ui.mensajeCuenta.textContent = 'Cuenta añadida exitosamente.';
        this.actualizarCuentasUI();
    }

    limpiarFormularioCuentas() {
        this.inputs.cuentaNombre.value = '';
        this.inputs.cuentaTipo.value = '';
        this.inputs.cuentaNaturaleza.value = '';
        this.ui.mensajeCuenta.textContent = '';
    }

    eliminarCuenta(index) {
        this.cuentas.splice(index, 1);
        this.actualizarCuentasUI();
        this.mostrarResultado();
    }

    actualizarCuentasUI() {
        this.mostrarCuentas();
        this.actualizarOpcionesCuentas();
        this.totales.resCuentas.textContent = this.cuentas.length;
    }

    mostrarCuentas() {
        if (this.cuentas.length === 0) {
            this.ui.listaCuentas.innerHTML = '<div class="fila"><span>No hay cuentas creadas.</span></div>';
            return;
        }

        this.ui.listaCuentas.innerHTML = '';
        this.cuentas.forEach((cuenta, index) => {
            const fila = document.createElement('div');
            fila.className = 'fila';
            fila.innerHTML = `
                <span>${cuenta.nombre}</span>
                <span>${cuenta.tipo}</span>
                <span>${cuenta.naturaleza}</span>
                <span><button class="boton boton-secundario btn-eliminar" data-index="${index}">Eliminar</button></span>
            `;
            // Listener directo adjunto eficientemente
            fila.querySelector('.btn-eliminar').addEventListener('click', () => this.eliminarCuenta(index));
            this.ui.listaCuentas.appendChild(fila);
        });
    }

    actualizarOpcionesCuentas() {
        const opciones = this.cuentas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
        this.inputs.movCuenta.innerHTML = `<option value="">Elige una cuenta</option>${opciones}`;
    }

    // --- GESTIÓN DE MOVIMIENTOS Y ASIENTOS ---
    agregarLineaAsiento() {
        const cuenta = this.inputs.movCuenta.value;
        const tipo = this.inputs.movTipo.value;
        const monto = parseFloat(this.inputs.movMonto.value);

        if (!cuenta || !tipo || isNaN(monto) || monto <= 0) {
            this.ui.mensajeAsiento.textContent = 'Datos de línea inválidos.';
            return;
        }

        this.asientoLineas.push({ cuenta, tipo, monto });
        this.inputs.movCuenta.value = '';
        this.inputs.movMonto.value = '';
        this.ui.mensajeAsiento.textContent = 'Línea añadida.';
        
        this.mostrarLineasAsiento();
        this.actualizarTotalesAsiento();
    }

    mostrarLineasAsiento() {
        if (this.asientoLineas.length === 0) {
            this.ui.listaLineas.innerHTML = '<div class="fila-linea"><span>No hay líneas en el asiento.</span></div>';
            return;
        }

        this.ui.listaLineas.innerHTML = '';
        this.asientoLineas.forEach((linea, index) => {
            const fila = document.createElement('div');
            fila.className = 'fila-linea';
            fila.innerHTML = `
                <span>${linea.cuenta}</span>
                <span>${linea.tipo}</span>
                <span>${this.formatearMoneda(linea.monto)}</span>
                <button class="boton boton-secundario btn-quitar">Quitar</button>
            `;
            fila.querySelector('.btn-quitar').addEventListener('click', () => {
                this.asientoLineas.splice(index, 1);
                this.mostrarLineasAsiento();
                this.actualizarTotalesAsiento();
            });
            this.ui.listaLineas.appendChild(fila);
        });
    }

    actualizarTotalesAsiento() {
        const totales = this.asientoLineas.reduce((acc, curr) => {
            acc[curr.tipo.toLowerCase()] += curr.monto;
            return acc;
        }, { debe: 0, haber: 0 });

        const diferencia = Math.abs(totales.debe - totales.haber);

        this.totales.debe.textContent = this.formatearMoneda(totales.debe);
        this.totales.haber.textContent = this.formatearMoneda(totales.haber);
        this.totales.diferencia.textContent = this.formatearMoneda(diferencia);
    }

    limpiarAsiento() {
        this.asientoLineas = [];
        this.inputs.entradaFecha.value = '';
        this.inputs.entradaDescripcion.value = '';
        this.mostrarLineasAsiento();
        this.actualizarTotalesAsiento();
        this.ui.mensajeAsiento.textContent = 'Asiento reiniciado.';
    }

    registrarAsiento() {
        const fecha = this.inputs.entradaFecha.value;
        const descripcion = this.inputs.entradaDescripcion.value.trim();

        if (!fecha || !descripcion || this.asientoLineas.length === 0) {
            this.ui.mensajeAsiento.textContent = 'Faltan metadatos o líneas del asiento.';
            return;
        }

        // Validación de cuadre exacto con margen de tolerancia decimal
        const tDebe = this.asientoLineas.filter(l => l.tipo === 'Debe').reduce((s, l) => s + l.monto, 0);
        const tHaber = this.asientoLineas.filter(l => l.tipo === 'Haber').reduce((s, l) => s + l.monto, 0);

        if (Math.abs(tDebe - tHaber) > 0.01 || tDebe === 0) {
            this.ui.mensajeAsiento.textContent = 'El asiento no cuadra aritméticamente.';
            return;
        }

        // Impactar las cuentas correspondientes
        this.asientoLineas.forEach(linea => {
            const cuenta = this.cuentas.find(c => c.nombre === linea.cuenta);
            if (cuenta) {
                if (linea.tipo === 'Debe') cuenta.debe += linea.monto;
                if (linea.tipo === 'Haber') cuenta.haber += linea.monto;
            }
        });

        this.asientos.push({ fecha, descripcion, lineas: [...this.asientoLineas] });
        this.limpiarAsiento();
        this.ui.mensajeAsiento.textContent = 'Asiento asentado con éxito.';
    }

    // --- REPORTEADOR Y RENDERS ---
    mostrarDiario() {
        if (this.asientos.length === 0) {
            this.ui.listaDiario.innerHTML = '<p>No hay asientos registrados.</p>';
            this.ui.mensajeDiario.textContent = '';
            return;
        }

        this.ui.listaDiario.innerHTML = this.asientos.map((asiento, idx) => `
            <div class="asiento">
                <div class="asiento-meta">
                    <div><strong>Asiento #${idx + 1}</strong></div>
                    <div>Fecha: ${asiento.fecha}</div>
                    <div>Descripción: ${asiento.descripcion}</div>
                </div>
                <div class="asiento-lineas">
                    ${asiento.lineas.map(l => `
                        <div class="fila-linea">
                            <span>${l.cuenta}</span>
                            <span>${l.tipo}</span>
                            <span>${this.formatearMoneda(l.monto)}</span>
                            <span></span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        this.ui.mensajeDiario.textContent = `Registros totales: ${this.asientos.length}`;
    }

    mostrarMayor() {
        if (this.cuentas.length === 0) {
            this.ui.listaMayor.innerHTML = '<div class="fila"><span>No hay registros en el mayor.</span></div>';
            return;
        }

        this.ui.listaMayor.innerHTML = this.cuentas.map(cuenta => `
            <div class="fila">
                <span>${cuenta.nombre}</span>
                <span>${this.formatearMoneda(cuenta.debe)}</span>
                <span>${this.formatearMoneda(cuenta.haber)}</span>
                <span>${this.formatearMoneda(this.obtenerSaldoCuenta(cuenta))}</span>
                <span>${cuenta.tipo}</span>
            </div>
        `).join('');
    }

    mostrarResultado() {
        const totalDebe = this.cuentas.reduce((sum, c) => sum + c.debe, 0);
        const totalHaber = this.cuentas.reduce((sum, c) => sum + c.haber, 0);

        this.totales.resAsientos.textContent = this.asientos.length;
        this.totales.resDebe.textContent = this.formatearMoneda(totalDebe);
        this.totales.resHaber.textContent = this.formatearMoneda(totalHaber);
        this.totales.resEstado.textContent = Math.abs(totalDebe - totalHaber) < 0.01 ? 'Balance Cuadrado' : 'Desbalance en Libros';
        
        this.dibujarGrafico();
    }

    dibujarGrafico() {
        const ctx = this.graficoCanvas.getContext('2d');
        if (!ctx) return;

        const { width: ancho, height: alto } = this.graficoCanvas;
        ctx.clearRect(0, 0, ancho, alto);

        if (this.cuentas.length === 0) {
            ctx.fillStyle = '#566573';
            ctx.font = '14px sans-serif';
            ctx.fillText('Sin métricas que graficar.', 20, 40);
            return;
        }

        const saldos = this.cuentas.map(c => Math.abs(this.obtenerSaldoCuenta(c)));
        const maxSaldo = Math.max(...saldos, 1);
        const padding = 50;
        const disponibleAncho = ancho - (padding * 2);
        const anchoBarra = Math.min(45, (disponibleAncho / this.cuentas.length) * 0.6);
        const pasoX = disponibleAncho / this.cuentas.length;

        this.cuentas.forEach((cuenta, idx) => {
            const saldo = Math.abs(this.obtenerSaldoCuenta(cuenta));
            const alturaBarra = (saldo / maxSaldo) * (alto - (padding * 2));
            const x = padding + (idx * pasoX) + (pasoX - anchoBarra) / 2;
            const y = alto - padding - alturaBarra;

            // Renderizado de Barra Estilizada SaaS
            ctx.fillStyle = '#1f618d';
            ctx.fillRect(x, y, anchoBarra, alturaBarra);

            // Nombres y Etiquetas
            ctx.fillStyle = '#222f3e';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cuenta.nombre, x + (anchoBarra / 2), alto - padding + 18);
            ctx.fillText(this.formatearMoneda(saldo), x + (anchoBarra / 2), y - 10);
        });
    }

    renderAll() {
        this.actualizarCuentasUI();
        this.limpiarAsiento();
    }
}

// Inicialización segura del ecosistema
document.addEventListener('DOMContentLoaded', () => {
    window.AppContable = new SistemaContable();
});