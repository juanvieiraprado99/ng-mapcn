export * from './chart.component';
export * from './chart-colors.util';
export * from './chart-echarts.provider';
export * from './chart-legend.component';
export * from './chart-option.builder';
export * from './chart-tooltip.component';
export * from './chart-tooltip.formatter';
// `chart-echarts.registry` is deliberately absent: it calls `echarts.use(...)` at module scope,
// so re-exporting it here would pull the whole engine into anything that touches this barrel.
// `provideZardCharts()` imports it on demand, and the server renderer does the same.
export * from './chart.imports';
export * from './chart.types';
export * from './chart.variants';
export * from './chart-context';
export * from './chart-ssr.util';
