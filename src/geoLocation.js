const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 1;
const MAX_ZOOM = 21;
/** Tolerancia para considerar que dos coordenadas son la misma. */
const EPSILON = 1e-6;
const TEMPLATE_URL = new URL("./geoLocation.html", import.meta.url);
/** Opciones fijas para getCurrentPosition y watchPosition. */
const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
});

/**
 * CSS base compartido por todas las instancias.
 * Va en `@layer geo.base` para que los overrides sin capa del consumidor ganen.
 */
const BASE_CSS = String.raw`
@layer geo.base, geo.overrides;

@layer geo.base {
  :host {
    --geo-width: 420px;
    display: block;
    width: 100%;
    max-width: var(--geo-width);
    --geo-border-color: #e2e8f0;
    --geo-radius: 24px;
    --geo-control-radius: 12px;
    --geo-background: #ffffff;
    --geo-font: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    --geo-map-height: 320px;
    --geo-accent: #0f766e;
    --geo-accent-hover: #115e59;
    --geo-accent-soft: #ecfdf5;
    --geo-accent-ring: rgba(15, 118, 110, 0.18);
    --geo-success: #10b981;
    --geo-text-color: #0f172a;
    --geo-muted: #64748b;
    --geo-surface-2: #f8fafc;
    --geo-grid: rgba(15, 118, 110, 0.07);
    --geo-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);

    font-family: var(--geo-font);
    color: var(--geo-text-color);
  }

  .card {
    width: 100%;
    box-sizing: border-box;
    padding: 24px;
    border: 1px solid var(--geo-border-color);
    border-radius: var(--geo-radius);
    background: var(--geo-background);
    box-shadow: var(--geo-shadow);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--geo-text-color);
  }

  .pin-badge {
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--geo-accent-soft);
    color: var(--geo-accent);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--geo-accent-soft);
    color: var(--geo-accent);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--geo-success);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }

  .map {
    position: relative;
    width: 100%;
    height: var(--geo-map-height);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px dashed #cbd5e1;
    border-radius: 16px;
    background-color: var(--geo-surface-2);
    background-image:
      linear-gradient(var(--geo-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--geo-grid) 1px, transparent 1px),
      radial-gradient(circle at 50% 42%, rgba(15, 118, 110, 0.1), transparent 65%);
    background-size: 22px 22px, 22px 22px, 100% 100%;
  }

  .map iframe {
    display: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .map.has-map {
    border-style: solid;
    border-color: var(--geo-border-color);
    background: #e2e8f0;
  }

  .map.has-map iframe {
    display: block;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 20px;
    text-align: center;
  }

  .map.has-map .placeholder {
    display: none;
  }

  .radar {
    position: relative;
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: var(--geo-accent-soft);
    color: var(--geo-accent);
  }

  .radar::before,
  .radar::after {
    content: "";
    position: absolute;
    inset: 0;
    border: 1px solid var(--geo-accent);
    border-radius: 50%;
    opacity: 0;
    animation: geo-pulse 3s ease-out infinite;
  }

  .radar::after {
    animation-delay: 1.5s;
  }

  @keyframes geo-pulse {
    0% {
      transform: scale(1);
      opacity: 0.45;
    }
    70% {
      transform: scale(1.65);
      opacity: 0;
    }
    100% {
      transform: scale(1.65);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .radar::before,
    .radar::after {
      animation: none;
      opacity: 0;
    }
  }

  .placeholder-text {
    max-width: 240px;
    margin: 0;
    color: var(--geo-muted);
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.4;
  }

  .coords {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 20px 0 18px;
  }

  .input-group label {
    display: block;
    margin-bottom: 6px;
    color: var(--geo-muted);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .input-group input {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 14px;
    border: 1.5px solid var(--geo-border-color);
    border-radius: var(--geo-control-radius);
    background-color: var(--geo-surface-2);
    color: var(--geo-text-color);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9rem;
    letter-spacing: 0.02em;
    outline: none;
    transition: all 0.2s ease;
  }

  .input-group input::placeholder {
    color: #94a3b8;
  }

  .input-group input:focus {
    border-color: var(--geo-accent);
    background-color: var(--geo-background);
    box-shadow: 0 0 0 3px var(--geo-accent-ring);
  }

  .input-group input:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    background-color: #f1f5f9;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
    padding: 12px 16px;
    border: 1px solid var(--geo-border-color);
    border-radius: var(--geo-control-radius);
    background-color: var(--geo-surface-2);
    cursor: pointer;
  }

  .toggle-label {
    color: #334155;
    font-size: 0.88rem;
    font-weight: 500;
    user-select: none;
  }

  .switch {
    position: relative;
    display: inline-block;
    flex-shrink: 0;
    width: 44px;
    height: 24px;
  }

  .switch input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .slider {
    position: absolute;
    inset: 0;
    border-radius: 34px;
    background-color: #cbd5e1;
    transition: 0.3s;
    pointer-events: none;
  }

  .slider::before {
    content: "";
    position: absolute;
    left: 3px;
    bottom: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: 0.3s;
  }

  .switch input:checked + .slider {
    background-color: var(--geo-accent);
  }

  .switch input:checked + .slider::before {
    transform: translateX(20px);
  }

  .switch input:focus-visible + .slider {
    outline: 2px solid var(--geo-accent);
    outline-offset: 2px;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: var(--geo-control-radius);
    background-color: var(--geo-accent);
    color: #ffffff;
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
  }

  .btn svg {
    flex-shrink: 0;
  }

  .btn:hover:not(:disabled) {
    background-color: var(--geo-accent-hover);
    transform: translateY(-1px);
  }

  .btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn:focus-visible {
    outline: 2px solid var(--geo-accent);
    outline-offset: 2px;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .status {
    min-height: 1.2em;
    margin: 14px 0 0;
    color: var(--geo-muted);
    font-size: 0.78rem;
  }

  .status.error {
    color: #b91c1c;
  }
}
`;

/** Detecta soporte de hojas construibles y adoptables. */
const supportsConstructableSheets =
  typeof CSSStyleSheet === "function" &&
  "replaceSync" in CSSStyleSheet.prototype &&
  typeof ShadowRoot !== "undefined" &&
  "adoptedStyleSheets" in ShadowRoot.prototype;

/** Hoja base única, compartida por todas las instancias. */
const BASE_SHEET = supportsConstructableSheets
  ? (() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(BASE_CSS);
      return sheet;
    })()
  : null;

/** Caché del template; si falla, se libera para permitir reintentos. */
let templatePromise = null;

/** Carga y cachea el <template> del componente. */
function loadTemplate() {
  if (!templatePromise) {
    templatePromise = fetch(TEMPLATE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar ${TEMPLATE_URL} (HTTP ${response.status})`);
        }
        return response.text();
      })
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const template = parsed.querySelector("template#geo-location-template");
        if (!template) {
          throw new Error('Falta <template id="geo-location-template"> en geoLocation.html');
        }
        return template;
      })
      .catch((error) => {
        templatePromise = null;
        throw error;
      });
  }
  return templatePromise;
}

/**
 * Custom element <geo-location>.
 *
 * Atributos: zoom, auto-follow.
 * Eventos:
 *   - location-change: { latitude, longitude, accuracy, source }
 *   - location-error: { code, message }
 * Slots: title, badge, placeholder, label-latitude, label-longitude,
 *        label-auto-follow, label-view.
 */
class GeoLocation extends HTMLElement {
  static observedAttributes = ["zoom", "auto-follow"];

  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this._initStyles();

    // Estado interno:
    // _isManual: el usuario editó coordenadas y aún no las aplicó.
    // _autoFollow: el mapa sigue las posiciones del watch.
    // _watchedCoords: última posición recibida del watch.
    // _displayedCoords: última posición pintada en el mapa.
    // _lastAccuracy / _lastErrorMessage: último dato mostrado / evitar errores repetidos.
    // _watchId / _rendered / _eventsBound / _renderPromise: ciclo de vida.
    this._zoom = DEFAULT_ZOOM;
    this._autoFollow = false;
    this._watchedCoords = null;
    this._displayedCoords = null;
    this._lastAccuracy = null;
    this._isManual = false;
    this._watchId = null;
    this._rendered = false;
    this._eventsBound = false;
    this._renderPromise = null;
    this._lastErrorMessage = null;
  }

  /** Renderiza el template y arranca el watch; la base ya está aplicada. */
  connectedCallback() {
    this._upgradeProperty("stylesheets");

    this._ensureRendered()
      .then(() => {
        if (!this.isConnected) return;
        this._startWatch();
      })
      .catch((error) => {
        console.error(error);
        this.shadowRoot.textContent = "No se pudo cargar el componente de geolocalización.";
      });
  }

  /** Detiene el watch para no dejar la suscripción viva. */
  disconnectedCallback() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
  }

  /** Refleja zoom y auto-follow en el estado interno y en los controles. */
  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === "zoom") {
      this._zoom = this._parseZoom(newValue);
      this._updateMapSource();
      return;
    }

    if (name === "auto-follow") {
      this._autoFollow = newValue !== null;

      if (this._autoFollow) this._isManual = false;

      if (!this._rendered) return;

      this._autoToggle.checked = this._autoFollow;
      this._syncControls();

      if (this._autoFollow && this._watchedCoords) {
        this._renderMap(this._watchedCoords, "Seguimiento automático activado", "watch");
      }
    }
  }

  /**
   * Coordenadas mostradas actualmente, o null si aún no hay ninguna.
   * @type {{ latitude: number, longitude: number } | null}
   */
  get currentLocation() {
    if (!this._displayedCoords) return null;
    return {
      latitude: this._displayedCoords.lat,
      longitude: this._displayedCoords.lng,
    };
  }

  /**
   * Hojas adicionales que se adoptan después de la base.
   * Acepta CSSStyleSheet, string CSS o un array de ambos.
   * `null` o `[]` restauran el estilo base.
   * @type {(CSSStyleSheet | string)[]}
   */
  get stylesheets() {
    return this._overrideSheets.slice();
  }

  set stylesheets(value) {
    this._overrideSheets = this._normalizeStylesheets(value);
    this._applyStylesheets();
  }

  /**
   * Fuerza una lectura puntual de la ubicación y actualiza el mapa.
   * @returns {Promise<{ latitude: number, longitude: number }>}
   * @throws {Error} Si la geolocalización no está disponible o falla.
   */
  async locate() {
    await this._ensureRendered();

    if (!("geolocation" in navigator)) {
      const message = "La geolocalización no está disponible en este navegador";
      this._setStatus(message, true);
      this._emitLocationError("unsupported", message);
      throw new Error(message);
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          this._isManual = false;
          this._watchedCoords = coords;
          this._lastAccuracy = Math.round(position.coords.accuracy);
          this._lastErrorMessage = null;
          this._renderMap(coords, "Ubicación actualizada", "api");

          resolve({ latitude: coords.lat, longitude: coords.lng });
        },
        (error) => {
          const message = this._geolocationErrorMessage(error);
          this._setStatus(message, true);
          this._emitLocationError(error.code, message);
          reject(new Error(message));
        },
        GEO_OPTIONS
      );
    });
  }

  /**
   * Muestra unas coordenadas concretas sin pedirlas al navegador.
   * @param {number|string} latitude
   * @param {number|string} longitude
   * @returns {Promise<boolean>} false si las coordenadas no son válidas.
   */
  async show(latitude, longitude) {
    await this._ensureRendered();

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!this._isValidCoords(lat, lng)) return false;

    this._isManual = true;
    this._renderMap({ lat, lng }, "Mostrando coordenadas indicadas", "api");
    return true;
  }

  /**
   * Aplica la misma lógica que el botón «Ver»: coordenadas manuales,
   * posición nueva del watch o aviso de «sin cambios».
   * @returns {Promise<void>}
   */
  async refresh() {
    await this._ensureRendered();
    this._handleView();
  }

  /** Crea la hoja base o los <style> de fallback en el shadow root. */
  _initStyles() {
    this._overrideSheets = [];

    if (BASE_SHEET) {
      this.shadowRoot.adoptedStyleSheets = [BASE_SHEET];
      return;
    }

    const baseStyle = document.createElement("style");
    baseStyle.dataset.geoBase = "";
    baseStyle.textContent = BASE_CSS;
    this.shadowRoot.append(baseStyle);

    this._overrideStyle = document.createElement("style");
    this._overrideStyle.dataset.geoOverrides = "";
    this.shadowRoot.append(this._overrideStyle);
  }

  /** Normaliza la entrada pública a hojas o texto según el soporte del navegador. */
  _normalizeStylesheets(value) {
    const input = value == null ? [] : Array.isArray(value) ? value : [value];

    return input
      .map((entry) => {
        if (!entry) return null;

        if (typeof entry === "string") {
          if (!supportsConstructableSheets) return entry;
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(entry);
          return sheet;
        }

        if (typeof CSSStyleSheet === "function" && entry instanceof CSSStyleSheet) {
          if (supportsConstructableSheets) return entry;
          try {
            return Array.from(entry.cssRules, (rule) => rule.cssText).join("\n");
          } catch {
            return null;
          }
        }

        return null;
      })
      .filter(Boolean);
  }

  /** Adopta [base, ...overrides]; si falla, conserva la base. */
  _applyStylesheets() {
    if (BASE_SHEET) {
      try {
        this.shadowRoot.adoptedStyleSheets = [BASE_SHEET, ...this._overrideSheets];
      } catch (error) {
        console.warn(
          "geo-location: no se pudo adoptar la hoja indicada; usa una CSSStyleSheet construida o un string CSS.",
          error
        );
      }
      return;
    }

    if (!this._overrideStyle) return;

    this._overrideStyle.textContent = this._overrideSheets
      .map((entry) => (typeof entry === "string" ? entry : ""))
      .join("\n");
  }

  /** Recupera una propiedad asignada antes del upgrade del custom element. */
  _upgradeProperty(name) {
    if (Object.prototype.hasOwnProperty.call(this, name)) {
      const value = this[name];
      delete this[name];
      this[name] = value;
    }
  }

  /** Renderiza el template una sola vez y cachea la promesa. */
  _ensureRendered() {
    if (this._rendered) return Promise.resolve();

    if (!this._renderPromise) {
      this._renderPromise = loadTemplate()
        .then((template) => {
          this.shadowRoot.appendChild(document.importNode(template.content, true));
          this._cacheElements();
          this._bindEvents();
          this._rendered = true;
          this._autoToggle.checked = this._autoFollow;
          this._syncControls();
          this._updateMapSource();
        })
        .catch((error) => {
          this._renderPromise = null;
          throw error;
        });
    }

    return this._renderPromise;
  }

  _cacheElements() {
    this._mapWrapper = this.shadowRoot.getElementById("map-wrapper");
    this._map = this.shadowRoot.getElementById("map");
    this._longitudeInput = this.shadowRoot.getElementById("longitude");
    this._latitudeInput = this.shadowRoot.getElementById("latitude");
    this._autoToggle = this.shadowRoot.getElementById("auto-follow");
    this._viewButton = this.shadowRoot.getElementById("view");
    this._status = this.shadowRoot.getElementById("status");
  }

  _bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    this._longitudeInput.addEventListener("input", () => { this._isManual = true; });
    this._latitudeInput.addEventListener("input", () => { this._isManual = true; });

    this._autoToggle.addEventListener("change", () => {
      this.toggleAttribute("auto-follow", this._autoToggle.checked);

      if (!this._autoFollow) {
        this._setStatus("Seguimiento automático desactivado");
      }
    });

    this._viewButton.addEventListener("click", () => this._handleView());
  }

  _syncControls() {
    const disabled = this._autoFollow;
    this._latitudeInput.disabled = disabled;
    this._longitudeInput.disabled = disabled;
  }

  _startWatch() {
    if (this._watchId !== null) return;
    if (!("geolocation" in navigator)) {
      this._viewButton.disabled = true;
      const message = "La geolocalización no está disponible en este navegador";
      this._setStatus(message, true);
      this._emitLocationError("unsupported", message);
      return;
    }

    this._watchId = navigator.geolocation.watchPosition(
      (position) => this._handlePosition(position),
      (error) => this._handlePositionError(error),
      GEO_OPTIONS
    );
  }

  /**
   * Decide qué hacer con cada posición del watch: modo manual,
   * auto-follow o aviso de «pulsa Ver».
   */
  _handlePosition(position) {
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    const accuracy = Math.round(position.coords.accuracy);

    this._watchedCoords = coords;
    this._lastAccuracy = accuracy;
    this._lastErrorMessage = null;

    if (this._isManual) {
      if (this._autoFollow) {
        this._setStatus(`Nueva ubicación detectada (±${accuracy} m) · pulsa Ver para aplicarla`);
      }
      return;
    }

    if (this._autoFollow) {
      this._renderMap(coords, `Seguimiento activo (±${accuracy} m)`, "watch");
    } else {
      this._setStatus(`Ubicación detectada (±${accuracy} m) · pulsa Ver para mostrarla`);
    }
  }

  _handlePositionError(error) {
    const message = this._geolocationErrorMessage(error);

    this._setStatus(message, true);

    if (message !== this._lastErrorMessage) {
      this._lastErrorMessage = message;
      this._emitLocationError(error.code, message);
    }
  }

  _geolocationErrorMessage(error) {
    const messages = {
      1: "Permiso de ubicación denegado",
      2: "Ubicación no disponible",
      3: "Se agotó el tiempo de espera para obtener la ubicación",
    };

    return messages[error.code] ?? "No se pudo obtener la ubicación";
  }

  /**
   * Prioridad del botón «Ver»: coordenadas manuales > posición nueva
   * del watch > aviso de «sin cambios».
   */
  _handleView() {
    if (!this._rendered) return;

    if (this._isManual) {
      const lat = Number.parseFloat(this._latitudeInput.value);
      const lng = Number.parseFloat(this._longitudeInput.value);

      if (!this._isValidCoords(lat, lng)) return;

      this._isManual = false;
      this._renderMap({ lat, lng }, "Mostrando coordenadas ingresadas", "manual");
      return;
    }

    if (this._watchedCoords && !this._isSameLocation(this._watchedCoords, this._displayedCoords)) {
      this._renderMap(this._watchedCoords, "Mostrando ubicación actual", "watch");
      return;
    }

    if (!this._displayedCoords) {
      this._setStatus("Aún no hay ubicación disponible", true);
      return;
    }

    this._setStatus("Ubicación sin cambios");
  }

  _isValidCoords(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this._failValidation("Ingresa longitud y latitud válidas");
      return false;
    }
    if (lat < -90 || lat > 90) {
      this._failValidation("La latitud debe estar entre -90 y 90");
      return false;
    }
    if (lng < -180 || lng > 180) {
      this._failValidation("La longitud debe estar entre -180 y 180");
      return false;
    }
    return true;
  }

  _failValidation(message) {
    this._setStatus(message, true);
    this._emitLocationError("invalid-coordinates", message);
  }

  /** Pinta coordenadas y emite location-change solo si cambiaron. */
  _renderMap(coords, message, source) {
    const changed = !this._isSameLocation(coords, this._displayedCoords);

    if (!changed) {
      if (message) this._setStatus(message);
      this._updateMapSource();
      return;
    }

    this._displayedCoords = { lat: coords.lat, lng: coords.lng };

    const latText = coords.lat.toFixed(6);
    const lngText = coords.lng.toFixed(6);
    const activeElement = this.shadowRoot.activeElement;

    if (activeElement !== this._latitudeInput) this._latitudeInput.value = latText;
    if (activeElement !== this._longitudeInput) this._longitudeInput.value = lngText;

    this._updateMapSource();
    this._setStatus(message ?? `lat ${latText} · lng ${lngText}`);
    this._emitLocationChange(source);
  }

  /** Construye el embed de Google Maps solo si cambió la URL. */
  _updateMapSource() {
    if (!this._rendered || !this._displayedCoords) return;

    const latText = this._displayedCoords.lat.toFixed(6);
    const lngText = this._displayedCoords.lng.toFixed(6);
    const url = `https://www.google.com/maps?q=${latText},${lngText}&z=${this._zoom}&output=embed`;

    if (this._map.getAttribute("src") !== url) {
      this._map.src = url;
      this._mapWrapper.classList.add("has-map");
    }
  }

  _parseZoom(value) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) return DEFAULT_ZOOM;

    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed));
  }

  /** Compara dos coordenadas con la tolerancia EPSILON. */
  _isSameLocation(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) <= EPSILON &&
      Math.abs(a.lng - b.lng) <= EPSILON;
  }

  _setStatus(text, isError = false) {
    this._status.textContent = text;
    this._status.classList.toggle("error", isError);
  }

  /**
   * Emite location-change con las coordenadas mostradas.
   * detail: { latitude, longitude, accuracy, source }
   */
  _emitLocationChange(source) {
    this.dispatchEvent(new CustomEvent("location-change", {
      bubbles: true,
      composed: true,
      detail: {
        latitude: this._displayedCoords.lat,
        longitude: this._displayedCoords.lng,
        accuracy: this._lastAccuracy,
        source,
      },
    }));
  }

  /**
   * Emite location-error.
   * detail: { code: number|string, message: string }
   */
  _emitLocationError(code, message) {
    this.dispatchEvent(new CustomEvent("location-error", {
      bubbles: true,
      composed: true,
      detail: { code, message },
    }));
  }
}

if (!customElements.get("geo-location")) {
  customElements.define("geo-location", GeoLocation);
}
