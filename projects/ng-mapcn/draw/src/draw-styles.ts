/** `#rrggbb` color, the only format terra-draw styling accepts. */
export type DrawHexColor = `#${string}`;

interface DrawPalette {
  accent: DrawHexColor;
  selected: DrawHexColor;
  outline: DrawHexColor;
}

/** Theme-aware default palette: accent for drawn shapes, amber for the selection. */
export const defaultDrawPalettes: Record<'light' | 'dark', DrawPalette> = {
  light: { accent: '#2563eb', selected: '#f59e0b', outline: '#ffffff' },
  dark: { accent: '#60a5fa', selected: '#fbbf24', outline: '#0b1220' },
};

/** Per-mode terra-draw styling derived from the resolved map theme. */
export interface DrawStyles {
  point: Record<string, number | DrawHexColor>;
  line: Record<string, number | DrawHexColor>;
  polygon: Record<string, number | DrawHexColor>;
  select: Record<string, number | DrawHexColor>;
}

/**
 * Builds terra-draw mode styles for a theme. `color` overrides the accent used by drawn shapes
 * (`#rrggbb`).
 */
export function buildDrawStyles(theme: 'light' | 'dark', color?: DrawHexColor): DrawStyles {
  const palette = defaultDrawPalettes[theme];
  const accent = color ?? palette.accent;
  const { selected, outline } = palette;
  return {
    point: {
      pointColor: accent,
      pointWidth: 6,
      pointOutlineColor: outline,
      pointOutlineWidth: 2,
    },
    line: {
      lineStringColor: accent,
      lineStringWidth: 3,
      closingPointColor: accent,
      closingPointWidth: 5,
      closingPointOutlineColor: outline,
      closingPointOutlineWidth: 2,
    },
    polygon: {
      fillColor: accent,
      fillOpacity: 0.2,
      outlineColor: accent,
      outlineWidth: 2,
      closingPointColor: accent,
      closingPointWidth: 5,
      closingPointOutlineColor: outline,
      closingPointOutlineWidth: 2,
    },
    select: {
      selectedPointColor: selected,
      selectedPointWidth: 7,
      selectedPointOutlineColor: outline,
      selectedPointOutlineWidth: 2,
      selectedLineStringColor: selected,
      selectedLineStringWidth: 3,
      selectedPolygonColor: selected,
      selectedPolygonFillOpacity: 0.25,
      selectedPolygonOutlineColor: selected,
      selectedPolygonOutlineWidth: 2,
      selectionPointColor: outline,
      selectionPointWidth: 5,
      selectionPointOutlineColor: selected,
      selectionPointOutlineWidth: 2,
      midPointColor: selected,
      midPointWidth: 4,
      midPointOutlineColor: outline,
      midPointOutlineWidth: 1,
    },
  };
}
