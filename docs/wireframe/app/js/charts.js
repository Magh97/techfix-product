/* ============================================================
   charts.js — Gráficas SVG sin librerías (line, bar, donut)
   ============================================================ */
"use strict";

const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = {
    primary: "#16A34A",
    accent: "#3B82F6",
    warning: "#F59E0B",
    danger: "#EF4444",
    muted: "#94A3B8",
    grid: "currentColor",
  };

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* Line / Area chart. data: array of {label, value}. */
  function lineChart(container, data, opts = {}) {
    container.innerHTML = "";
    const w = 560, h = 180, padL = 40, padR = 12, padT = 12, padB = 24;
    const max = Math.max(...data.map((d) => d.value), 1) * 1.15;
    const min = 0;
    const innerW = w - padL - padR, innerH = h - padT - padB;
    const x = (i) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;

    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": opts.label || "Gráfica" });
    const grid = svgEl("g", { stroke: "var(--border)", "stroke-width": 1, "shape-rendering": "crispEdges" });
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (innerH / 4) * g;
      grid.appendChild(svgEl("line", { x1: padL, x2: w - padR, y1: gy, y2: gy, "stroke-dasharray": "3 4" }));
      const lbl = svgEl("text", { x: padL - 6, y: gy + 3, "text-anchor": "end", "font-size": 9, fill: "var(--text-faint)" });
      lbl.textContent = Math.round(max - (max / 4) * g);
      grid.appendChild(lbl);
    }
    svg.appendChild(grid);

    const area = svgEl("path", {
      d: data.map((d, i) => (i ? "L" : "M") + x(i) + " " + y(d.value)).join(" ") + ` L${x(data.length - 1)} ${padT + innerH} L${padL} ${padT + innerH} Z`,
      fill: opts.fill || "var(--accent)", opacity: "0.12", stroke: "none",
    });
    const line = svgEl("path", {
      d: data.map((d, i) => (i ? "L" : "M") + x(i) + " " + y(d.value)).join(" "),
      fill: "none", stroke: opts.stroke || "var(--accent)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round",
    });
    svg.appendChild(area);
    svg.appendChild(line);

    data.forEach((d, i) => {
      const dot = svgEl("circle", { cx: x(i), cy: y(d.value), r: 3, fill: opts.stroke || "var(--accent)" });
      const title = svgEl("title", {});
      title.textContent = `${d.label}: ${fmtMXN(d.value)}`;
      dot.appendChild(title);
      svg.appendChild(dot);
    });

    data.forEach((d, i) => {
      if (i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return;
      const lbl = svgEl("text", { x: x(i), y: h - 8, "text-anchor": "middle", "font-size": 9, fill: "var(--text-faint)" });
      lbl.textContent = d.label;
      svg.appendChild(lbl);
    });

    container.appendChild(svg);
  }

  /* Horizontal bar chart. data: array of {label, value, color?}. */
  function barChart(container, data, opts = {}) {
    container.innerHTML = "";
    const w = 420, rowH = 34, padL = 8, padR = 52, padT = 8, padB = 8;
    const h = padT + padB + data.length * rowH;
    const max = Math.max(...data.map((d) => d.value), 1);
    const innerW = w - padL - padR;

    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": opts.label || "Comparativa" });
    data.forEach((d, i) => {
      const y = padT + i * rowH + 8;
      const bw = (d.value / max) * innerW;
      const track = svgEl("rect", { x: padL, y, width: innerW, height: 18, rx: 5, fill: "var(--surface-2)" });
      const bar = svgEl("rect", { x: padL, y, width: Math.max(2, bw), height: 18, rx: 5, fill: d.color || opts.color || "var(--accent)" });
      const label = svgEl("text", { x: padL, y: y + 13, "font-size": 11, fill: "var(--text)" });
      label.textContent = d.label;
      const val = svgEl("text", { x: padL + Math.max(bw, 8) + 6, y: y + 13, "font-size": 11, "font-weight": 700, fill: "var(--text-muted)" });
      val.textContent = fmtMXN(d.value);
      const tt = svgEl("title", {});
      tt.textContent = `${d.label}: ${fmtMXN(d.value)}`;
      bar.appendChild(tt);
      svg.appendChild(track);
      svg.appendChild(bar);
      svg.appendChild(label);
      svg.appendChild(val);
    });
    container.appendChild(svg);
  }

  /* Donut chart. data: array of {label, value, color}. */
  function donutChart(container, data, opts = {}) {
    container.innerHTML = "";
    const size = 180, stroke = 22, r = (size - stroke) / 2 - 2;
    const cx = size / 2, cy = size / 2;
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    let acc = 0;
    const CIRC = 2 * Math.PI * r;

    const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": opts.label || "Distribución" });
    svg.appendChild(svgEl("circle", { cx, cy, r, fill: "none", stroke: "var(--surface-2)", "stroke-width": stroke }));
    data.forEach((d) => {
      const frac = d.value / total;
      const dash = frac * CIRC;
      const seg = svgEl("circle", {
        cx, cy, r, fill: "none", stroke: d.color || COLORS.accent, "stroke-width": stroke,
        "stroke-dasharray": `${dash - 2} ${CIRC - dash + 2}`,
        "stroke-dashoffset": -acc * CIRC, "stroke-linecap": "round",
      });
      const title = svgEl("title", {});
      title.textContent = `${d.label}: ${fmtMXN(d.value)} (${Math.round(frac * 100)}%)`;
      seg.appendChild(title);
      svg.appendChild(seg);
      acc += frac;
    });
    const center = svgEl("text", { x: cx, y: cy - 2, "text-anchor": "middle", "font-size": 20, "font-weight": 700, fill: "var(--text)" });
    center.textContent = fmtMXN(total);
    const sub = svgEl("text", { x: cx, y: cy + 16, "text-anchor": "middle", "font-size": 9, fill: "var(--text-faint)" });
    sub.textContent = opts.centerLabel || "Total";
    svg.appendChild(center);
    svg.appendChild(sub);
    container.appendChild(svg);
  }

  /* Sparkline (mini trend). */
  function spark(container, values, color = COLORS.accent) {
    const data = values.map((v, i) => ({ label: String(i), value: v }));
    lineChart(container, data, { stroke: color, fill: color, label: "Tendencia" });
  }

  return { lineChart, barChart, donutChart, spark, COLORS };
})();
