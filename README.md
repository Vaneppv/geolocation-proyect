# Geolocation Web Component

Componente web (`<geo-location>`) que obtiene la ubicación del usuario con la [Geolocation API](https://developer.mozilla.org/es/docs/Web/API/Geolocation_API) y la muestra en un mapa de Google Maps embebido (sin API key). Está construido como un custom element con Shadow DOM: markup, estilos y lógica encapsulados, sin dependencias ni build step.

## Características

- Custom element autocontenido (`geoLocation.js` + `geoLocation.html` + `geoLocation.css`).
- Seguimiento continuo de la ubicación con `navigator.geolocation.watchPosition`.
- Toggle de seguimiento automático (desactivado por defecto); al activarlo, los inputs de coordenadas se deshabilitan.
- Entrada manual de longitud y latitud con validación de rangos.
- Prevención de re-renders cuando la ubicación no cambió.
- API pública: atributos, métodos, eventos, slots y `::part`.
- Estilos encapsulados con `adoptedStyleSheets` y personalizables con variables CSS.

## Requisitos

- Navegador moderno con soporte de Web Components, `adoptedStyleSheets` y Geolocation API.
- Contexto seguro: `http://localhost` o HTTPS. La geolocalización **no funciona** en `file://`.
- Conexión a internet para cargar el iframe de Google Maps.

## Cómo ejecutar

```bash
cd src
python3 -m http.server 8000
```

Luego abre <http://localhost:8000>. El navegador pedirá permiso de ubicación.

## Uso

```html
<script type="module" src="./geoLocation.js"></script>

<geo-location zoom="12">
  <span slot="title">Mi ubicación</span>
  <span slot="label-view">Buscar</span>
</geo-location>
```

### Atributos

| Atributo      | Tipo    | Default | Descripción                                                        |
| ------------- | ------- | ------- | ------------------------------------------------------------------ |
| `zoom`        | entero  | `15`    | Nivel de zoom del mapa (se limita al rango 1–21).                  |
| `auto-follow` | booleano| ausente | Si está presente, el mapa sigue automáticamente la ubicación y los inputs se deshabilitan. |

### Slots

| Slot                   | Texto por defecto                              |
| ---------------------- | ---------------------------------------------- |
| `title`                | `Geolocation`                                  |
| `badge`                | `GPS Ready`                                    |
| `placeholder`          | `Pulsa «Ver» para cargar tu ubicación en el mapa` |
| `label-latitude`       | `Latitud`                                      |
| `label-longitude`      | `Longitud`                                     |
| `label-auto-follow`    | `Seguir mi ubicación automáticamente`          |
| `label-view`           | `Ver ubicación`                                |

### Métodos

| Método               | Descripción                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `locate()`           | Fuerza `getCurrentPosition`, actualiza el mapa y devuelve `{ latitude, longitude }`. |
| `show(lat, lng)`     | Muestra las coordenadas indicadas (equivale a la entrada manual). Devuelve `true`/`false`. |
| `refresh()`          | Aplica la lógica del botón «Ver» (coords manuales, nuevas o sin cambios).    |
| `currentLocation`    | Getter con las coords mostradas: `{ latitude, longitude }` o `null`.        |

```js
const geo = document.querySelector("geo-location");

await geo.show(19.4326, -99.1332);
await geo.locate();
geo.refresh();
console.log(geo.currentLocation);
```

### Eventos

| Evento             | `detail`                                                        |
| ------------------ | --------------------------------------------------------------- |
| `location-change`  | `{ latitude, longitude, accuracy, source }`                     |
| `location-error`   | `{ code, message }`                                             |

`source` puede ser `"watch"`, `"manual"` o `"api"`. `location-change` solo se emite cuando cambian las coordenadas mostradas. `location-error` usa los códigos de la Geolocation API (`1`, `2`, `3`) o valores como `"unsupported"` e `"invalid-coordinates"`. Ambos eventos son `bubbles` y `composed`.

```js
geo.addEventListener("location-change", (event) => {
  console.log(event.detail);
});
```

### Personalización

Variables CSS (con fallback en el componente):

| Variable                | Default                          |
| ----------------------- | -------------------------------- |
| `--geo-width`           | `420px`                          |
| `--geo-border-color`    | `#e2e8f0`                        |
| `--geo-radius`          | `24px`                           |
| `--geo-control-radius`  | `12px`                           |
| `--geo-background`      | `#ffffff`                        |
| `--geo-font`            | `"Inter", system-ui, ...`        |
| `--geo-map-height`      | `320px`                          |
| `--geo-accent`          | `#0f766e`                        |
| `--geo-accent-hover`    | `#115e59`                        |
| `--geo-accent-soft`     | `#ecfdf5`                        |
| `--geo-accent-ring`     | `rgba(15, 118, 110, 0.18)`       |
| `--geo-success`         | `#10b981`                        |
| `--geo-text-color`      | `#0f172a`                        |
| `--geo-muted`           | `#64748b`                        |
| `--geo-surface-2`       | `#f8fafc`                        |
| `--geo-grid`            | `rgba(15, 118, 110, 0.07)`       |
| `--geo-shadow`          | `0 20px 25px -5px rgba(...)`     |

```css
geo-location {
  --geo-width: 480px;
  --geo-accent: #059669;
  --geo-accent-hover: #047857;
}
```

Partes expuestas con `::part`: `card`, `header`, `title`, `icon`, `badge`, `map`, `map-iframe`, `placeholder`, `radar`, `coords`, `field`, `label`, `input`, `toggle`, `switch`, `checkbox`, `slider`, `button`, `status`.

```css
geo-location::part(button) {
  font-weight: 600;
}
```

## Estructura del proyecto

```
src/
├── index.html          # Página de demostración
├── style.css           # Estilos de la página de demostración
├── geoLocation.js      # Custom element y lógica
├── geoLocation.html    # <template> del componente
└── geoLocation.css     # Estilos encapsulados
```

## Notas

- El mapa se muestra con el embed de Google Maps por URL (`https://www.google.com/maps?q=LAT,LNG&z=ZOOM&output=embed`), sin API key.
- Si el navegador ya recordó una decisión de permiso, no volverá a preguntar: restablécela desde la configuración del sitio (icono del candado → Ubicación).
- Sin licencia.
