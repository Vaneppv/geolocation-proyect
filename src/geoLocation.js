const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 1;
const MAX_ZOOM = 21;
const EPSILON = 1e-6;
const TEMPLATE_URL = new URL("./geoLocation.html", import.meta.url);
const STYLES_URL = new URL("./geoLocation.css", import.meta.url);
const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
});

let templatePromise = null;
let stylesheetPromise = null;

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
      });
  }
  return templatePromise;
}

function loadStyleSheet() {
  if (!stylesheetPromise) {
    stylesheetPromise = fetch(STYLES_URL)
      .then((response) => response.text())
      .then((css) => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        return sheet;
      });
  }
  return stylesheetPromise;
}

class GeoLocation extends HTMLElement {
  static observedAttributes = ["zoom", "auto-follow"];

  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this._zoom = DEFAULT_ZOOM;
    this._autoFollow = false;
    this._watchedCoords = null;
    this._displayedCoords = null;
    this._lastAccuracy = null;
    this._isManual = false;
    this._watchId = null;
    this._rendered = false;
    this._stylesApplied = false;
    this._eventsBound = false;
    this._renderPromise = null;
    this._lastErrorMessage = null;
  }

  connectedCallback() {
    this._ensureRendered()
      .then(() => {
        if (!this.isConnected) return;

        if (!this._stylesApplied) {
          this._applyStyles();
        }

        this._startWatch();
      })
      .catch((error) => {
        console.error(error);
        this.shadowRoot.textContent = "No se pudo cargar el componente de geolocalización.";
      });
  }

  disconnectedCallback() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
  }

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

  get currentLocation() {
    if (!this._displayedCoords) return null;
    return {
      latitude: this._displayedCoords.lat,
      longitude: this._displayedCoords.lng,
    };
  }

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

  async show(latitude, longitude) {
    await this._ensureRendered();

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!this._isValidCoords(lat, lng)) return false;

    this._isManual = true;
    this._renderMap({ lat, lng }, "Mostrando coordenadas indicadas", "api");
    return true;
  }

  async refresh() {
    await this._ensureRendered();
    this._handleView();
  }

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

  async _applyStyles() {
    if ("adoptedStyleSheets" in this.shadowRoot) {
      try {
        const sheet = await loadStyleSheet();
        this.shadowRoot.adoptedStyleSheets = [sheet];
        this._stylesApplied = true;
        return;
      } catch {
        stylesheetPromise = null;
      }
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLES_URL.href;
    this.shadowRoot.appendChild(link);
    this._stylesApplied = true;
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

  _isSameLocation(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) <= EPSILON &&
      Math.abs(a.lng - b.lng) <= EPSILON;
  }

  _setStatus(text, isError = false) {
    this._status.textContent = text;
    this._status.classList.toggle("error", isError);
  }

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
