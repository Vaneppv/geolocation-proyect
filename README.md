# Geolocation Web Component

Componente web (`<geo-location>`) que obtiene la ubicación del usuario con la [Geolocation API](https://developer.mozilla.org/es/docs/Web/API/Geolocation_API) y la muestra en un mapa de Google Maps embebido (sin API key). Está construido como un custom element con Shadow DOM: markup, estilos y lógica encapsulados, sin dependencias ni build step.

## Características

- Custom element autocontenido (`geoLocation.js` + `geoLocation.html` + `geoLocation.css`).
- Seguimiento continuo de la ubicación con `navigator.geolocation.watchPosition`.
- Toggle de seguimiento automático (desactivado por defecto).
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
| `auto-follow` | booleano| ausente | Si está presente, el mapa sigue automáticamente la ubicación.      |

### Slots

| Slot                   | Texto por defecto                     |
| ---------------------- | ------------------------------------- |
| `title`                | `Geolocation`                         |
| `label-longitude`      | `longitud`                            |
| `label-latitude`       | `latitud`                             |
| `label-auto-follow`    | `Seguir mi ubicación automáticamente` |
| `label-view`           | `Ver`                                 |

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

| Variable             | Default                          |
| -------------------- | -------------------------------- |
| `--geo-width`        | `min(360px, 100%)`               |
| `--geo-border-color` | `#111827`                        |
| `--geo-radius`       | `8px`                            |
| `--geo-background`   | `#ffffff`                        |
| `--geo-font`         | `system-ui, ...`                 |
| `--geo-map-aspect`   | `3 / 4`                          |
| `--geo-accent`       | `#111827`                        |
| `--geo-text-color`   | `#1f2937`                        |

```css
geo-location {
  --geo-width: 420px;
  --geo-border-color: #0ea5e9;
}
```

Partes expuestas con `::part`: `card`, `title`, `map`, `map-iframe`, `placeholder`, `field`, `label`, `input`, `toggle`, `checkbox`, `button`, `status`.

```css
geo-location::part(button) {
  font-weight: 600;
}
```

## Estructura del proyecto

```
src/
├── index.html          # Página de demostración
├── geoLocation.js      # Custom element y lógica
├── geoLocation.html    # <template> del componente
└── geoLocation.css     # Estilos encapsulados
```

## Notas

- El mapa se muestra con el embed de Google Maps por URL (`https://www.google.com/maps?q=LAT,LNG&z=ZOOM&output=embed`), sin API key.
- Si el navegador ya recordó una decisión de permiso, no volverá a preguntar: restablécela desde la configuración del sitio (icono del candado → Ubicación).
- Sin licencia.
