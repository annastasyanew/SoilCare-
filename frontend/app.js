import { database } from "./firebase.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const demoReadings = [
  { timestamp: "2026-06-08 08:00:00", adc_value: 2500, moisture: 45 },
  { timestamp: "2026-06-08 09:00:00", adc_value: 2700, moisture: 38 },
  { timestamp: "2026-06-08 10:00:00", adc_value: 3300, moisture: 28 },
  { timestamp: "2026-06-08 11:00:00", adc_value: 1100, moisture: 75 }
];

const categoryData = [
  { className: "dry", range: "0 - 30%", label: "Kering", description: "Perlu penyiraman manual" },
  { className: "normal", range: "31 - 70%", label: "Normal", description: "Kondisi tanah ideal" },
  { className: "wet", range: "71 - 100%", label: "Terlalu basah", description: "Tunda penyiraman" }
];

const statusClassMap = {
  Kering: "dry",
  Normal: "normal",
  "Terlalu basah": "wet"
};

const statusInfo = {
  Kering: {
    title: "Tanah dalam kondisi kering.",
    text: "Segera siram tanaman secara manual agar tanaman tidak mengalami stres.",
    hint: "Perlu penyiraman manual"
  },
  Normal: {
    title: "Tanah dalam kondisi normal.",
    text: "Tidak perlu menyiram saat ini.",
    hint: "Tidak perlu menyiram"
  },
  "Terlalu basah": {
    title: "Tanah terlalu basah.",
    text: "Hentikan penyiraman sementara dan pastikan media tanam memiliki drainase baik.",
    hint: "Hentikan penyiraman sementara"
  }
};

const appState = {
  isLoaded: false,
  firebaseConnected: null,
  filterStatus: "Semua Status",
  searchQuery: "",
  period: "Semua Riwayat",
  dateFrom: "",
  dateTo: "",
  graphRange: "all",
  historyPage: 1
};

const DEVICE_OFFLINE_AFTER_MS = 3 * 60 * 1000;
const HISTORY_PAGE_SIZE = 20;

let readings = demoReadings.map(normalizeReading);
let latest = readings[readings.length - 1];
let dashboardChart;
let mainChart;

function evaluateMoisture(moisture) {
  if (moisture <= 30) {
    return ["Kering", "Siram tanaman secara manual"];
  }

  if (moisture <= 70) {
    return ["Normal", "Tidak perlu menyiram"];
  }

  return ["Terlalu basah", "Hentikan penyiraman sementara"];
}

function normalizeReading(item) {
  const moisture = Number(item.moisture ?? item.kelembapan ?? 0);
  const [status, recommendation] = evaluateMoisture(moisture);

  return {
    device_id: item.device_id ?? "ESP32-CABAI-01",
    adc_value: item.adc_value ?? item.adc ?? "-",
    moisture,
    status: item.status ?? status,
    recommendation: item.recommendation ?? item.rekomendasi ?? recommendation,
    timestamp: item.timestamp ?? item.waktu ?? "-"
  };
}

function formatTime(timestamp) {
  const date = new Date(String(timestamp).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return timestamp || "--";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getReadingTime(timestamp) {
  const time = new Date(String(timestamp).replace(" ", "T")).getTime();
  return Number.isNaN(time) ? null : time;
}

function getDateBoundary(dateValue, boundary) {
  if (!dateValue) {
    return null;
  }

  const suffix = boundary === "end" ? "T23:59:59.999" : "T00:00:00.000";
  const time = new Date(`${dateValue}${suffix}`).getTime();

  return Number.isNaN(time) ? null : time;
}

function isDeviceOnline() {
  const lastReadingTime = latest ? getReadingTime(latest.timestamp) : null;

  return Boolean(
    navigator.onLine
    && appState.firebaseConnected
    && lastReadingTime
    && Date.now() - lastReadingTime <= DEVICE_OFFLINE_AFTER_MS
  );
}

function getStats() {
  const values = readings.map((item) => item.moisture);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    max: Math.max(...values),
    min: Math.min(...values),
    average: Math.round(total / values.length)
  };
}

function getStatsFor(items) {
  const values = items.map((item) => item.moisture);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (!values.length) {
    return { max: 0, min: 0, average: 0 };
  }

  return {
    max: Math.max(...values),
    min: Math.min(...values),
    average: Math.round(total / values.length)
  };
}

function graphReadings() {
  if (appState.graphRange === "all") {
    return readings;
  }

  const now = new Date();
  const rangeStart = {
    today: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
    "7d": now.getTime() - (7 * 24 * 60 * 60 * 1000),
    "30d": now.getTime() - (30 * 24 * 60 * 60 * 1000)
  }[appState.graphRange];

  if (rangeStart) {
    const rangedReadings = readings.filter((item) => {
      const readingTime = getReadingTime(item.timestamp);
      return readingTime && readingTime >= rangeStart;
    });

    return rangedReadings;
  }

  return readings;
}

function setText(selector, text) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = text;
  });
}

function setById(id, text) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = text;
  }
}

function setStateById(id, text, state) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = text;
  element.classList.remove("green-text", "red-text", "muted-text");
  element.classList.add(`${state}-text`);
}

function setHtml(id, html) {
  const element = document.getElementById(id);

  if (element) {
    element.innerHTML = html;
  }
}

function renderLoadingState() {
  const loadingText = "Memuat data...";
  setText('[data-field="humidity"]', loadingText);
  setText('[data-field="updated"]', loadingText);
  setText('[data-field="adc"]', loadingText);
  setText('[data-field="status"]', loadingText);
  setText('[data-field="recommendation"]', loadingText);
  setText('[data-field="device"]', loadingText);
  setById("statusHint", loadingText);
  setById("alertHeadingText", "Status Kondisi");
  setById("alertTitle", loadingText);
  setById("alertText", "Mohon tunggu sambungan Firebase.");
  setById("averageCard", loadingText);
  setById("totalData", loadingText);
  setById("lastReading", loadingText);
  setById("lastReadingTime", loadingText);
  setById("historyAverage", loadingText);
  setStateById("deviceStatusText", loadingText, "muted");
  setStateById("deviceConnectionText", loadingText, "muted");
  setStateById("deviceUpdateText", loadingText, "muted");
  setHtml("chartSummary", `
    <div class="table-state">${loadingText}</div>
  `);
  setHtml("historySummary", `
    <div class="table-state">${loadingText}</div>
  `);
  setHtml("dashboardHistory", '<tr><td colspan="4" class="table-state">Memuat riwayat...</td></tr>');
  setHtml("historyTable", '<tr><td colspan="5" class="table-state">Memuat riwayat...</td></tr>');
  setHtml("monitoringInsight", `
    <div class="table-state">Memuat insight kondisi tanah...</div>
  `);
}

function getFilteredReadings() {
  const query = appState.searchQuery.trim().toLowerCase();
  const now = new Date();
  const periodStart = {
    "Hari Ini": new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
    "7 Hari Terakhir": now.getTime() - (7 * 24 * 60 * 60 * 1000),
    "30 Hari Terakhir": now.getTime() - (30 * 24 * 60 * 60 * 1000)
  }[appState.period];
  const dateFrom = getDateBoundary(appState.dateFrom, "start");
  const dateTo = getDateBoundary(appState.dateTo, "end");

  return readings.filter((item) => {
    const readingTime = getReadingTime(item.timestamp);
    const matchesPeriod = !periodStart || (readingTime && readingTime >= periodStart);
    const matchesDateFrom = !dateFrom || (readingTime && readingTime >= dateFrom);
    const matchesDateTo = !dateTo || (readingTime && readingTime <= dateTo);
    const matchesStatus = appState.filterStatus === "Semua Status" || item.status === appState.filterStatus;
    const matchesSearch = !query || [
      formatTime(item.timestamp),
      item.status,
      item.recommendation,
      String(item.adc_value)
    ].some((value) => String(value).toLowerCase().includes(query));

    return matchesPeriod && matchesDateFrom && matchesDateTo && matchesStatus && matchesSearch;
  });
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function exportCsv() {
  const rows = getFilteredReadings();

  if (!rows.length) {
    return;
  }

  const headers = ["Waktu", "ADC", "Kelembapan", "Status", "Rekomendasi"];
  const body = rows.map((item) => [
    formatTime(item.timestamp),
    item.adc_value,
    `${item.moisture}%`,
    item.status,
    item.recommendation
  ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");

  downloadFile("soilcare-riwayat.csv", `${headers.join(",")}\n${body}`, "text/csv;charset=utf-8;");
}

function exportExcel() {
  const rows = getFilteredReadings();

  if (!rows.length) {
    return;
  }

  const headers = ["Waktu", "ADC", "Kelembapan", "Status", "Rekomendasi"];
  const html = `
    <table>
      <thead><tr>${headers.map((text) => `<th>${text}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((item) => `
        <tr>
          <td>${formatTime(item.timestamp)}</td>
          <td>${item.adc_value}</td>
          <td>${item.moisture}%</td>
          <td>${item.status}</td>
          <td>${item.recommendation}</td>
        </tr>
      `).join("")}</tbody>
    </table>`;

  downloadFile("soilcare-riwayat.xls", html, "application/vnd.ms-excel");
}

function paginationPageNumbers(currentPage, totalPages) {
  const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const lastPage = Math.min(totalPages, firstPage + 4);

  return Array.from(
    { length: lastPage - firstPage + 1 },
    (_, index) => firstPage + index
  ).map((page) => `
    <button
      type="button"
      class="pagination-number ${page === currentPage ? "active" : ""}"
      data-history-page="${page}"
      aria-label="Buka halaman ${page}"
      ${page === currentPage ? 'aria-current="page"' : ""}
    >${page}</button>
  `).join("");
}

function renderHistory() {
  if (!appState.isLoaded) {
    setHtml("historyTable", '<tr><td colspan="5" class="table-state">Memuat riwayat...</td></tr>');
    return;
  }

  const filtered = getFilteredReadings();

  if (!filtered.length) {
    setHtml("historyTable", '<tr><td colspan="5" class="table-state">Belum ada data riwayat untuk filter saat ini.</td></tr>');
    setHtml("historyPagination", '<span>Tidak ada data yang dapat ditampilkan.</span>');
    return;
  }

  const totalPages = Math.ceil(filtered.length / HISTORY_PAGE_SIZE);
  appState.historyPage = Math.min(Math.max(appState.historyPage, 1), totalPages);

  const end = filtered.length - ((appState.historyPage - 1) * HISTORY_PAGE_SIZE);
  const start = Math.max(0, end - HISTORY_PAGE_SIZE);
  const pageRows = filtered.slice(start, end);

  setHtml("historyTable", tableRows(pageRows, true));
  setHtml("historyPagination", `
    <span class="pagination-info">Menampilkan ${filtered.length - end + 1}-${filtered.length - start} dari ${filtered.length} data</span>
    <div class="pagination-buttons">
      <button type="button" data-history-page="${appState.historyPage - 1}" ${appState.historyPage === 1 ? "disabled" : ""}>&lt; Sebelumnya</button>
      <div class="pagination-numbers">${paginationPageNumbers(appState.historyPage, totalPages)}</div>
      <button type="button" data-history-page="${appState.historyPage + 1}" ${appState.historyPage === totalPages ? "disabled" : ""}>Berikutnya &gt;</button>
    </div>
  `);
}

function renderStatusIndicators() {
  if (!appState.isLoaded) {
    setById("systemStatus", "Memuat...");
    setById("connectionStatus", "Memeriksa sensor...");
    setById("firebaseStatus", "Memeriksa database...");
    setById("lastUpdateStatus", "--");
    setStateById("deviceStatusText", "Memuat...", "muted");
    setStateById("deviceConnectionText", "Memuat...", "muted");
    setStateById("deviceUpdateText", "--", "muted");
    return;
  }

  const deviceOnline = isDeviceOnline();
  setById("systemStatus", deviceOnline ? "Sistem Online" : "Sistem Offline");
  setById("connectionStatus", deviceOnline ? "Sensor Terhubung" : "Sensor Terputus");
  setById("firebaseStatus", appState.firebaseConnected ? "Database Aktif" : "Database Terputus");
  setById("lastUpdateStatus", latest ? formatTime(latest.timestamp) : "--");
  setStateById("deviceStatusText", deviceOnline ? "Aktif" : "Nonaktif", deviceOnline ? "green" : "red");
  setStateById("deviceConnectionText", deviceOnline ? "Terhubung" : "Terputus", deviceOnline ? "green" : "red");
  setStateById("deviceUpdateText", latest ? formatTime(latest.timestamp) : "--", deviceOnline ? "green" : "red");

  document.querySelector(".status-dot.online")?.classList.toggle("offline", !deviceOnline);
  document.querySelector(".status-dot.connected")?.classList.toggle("offline", !deviceOnline);
  document.querySelector(".status-dot.firebase")?.classList.toggle("offline", !appState.firebaseConnected);
  document.querySelector(".status-dot.update")?.classList.toggle("offline", !deviceOnline);
}

function initHistoryControls() {
  const searchInput = document.getElementById("historySearch");
  const statusSelect = document.getElementById("historyStatus");
  const periodSelect = document.getElementById("historyPeriod");
  const dateFromInput = document.getElementById("historyDateFrom");
  const dateToInput = document.getElementById("historyDateTo");
  const pagination = document.getElementById("historyPagination");
  const exportCsvBtn = document.getElementById("exportCsv");
  const exportExcelBtn = document.getElementById("exportExcel");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      appState.searchQuery = event.currentTarget.value;
      appState.historyPage = 1;
      renderAll();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", (event) => {
      appState.filterStatus = event.currentTarget.value;
      appState.historyPage = 1;
      renderAll();
    });
  }

  if (periodSelect) {
    periodSelect.addEventListener("change", (event) => {
      appState.period = event.currentTarget.value;
      appState.dateFrom = "";
      appState.dateTo = "";
      if (dateFromInput) dateFromInput.value = "";
      if (dateToInput) dateToInput.value = "";
      appState.historyPage = 1;
      renderAll();
    });
  }

  if (dateFromInput) {
    dateFromInput.addEventListener("change", (event) => {
      appState.dateFrom = event.currentTarget.value;
      appState.period = "Semua Riwayat";
      if (periodSelect) periodSelect.value = appState.period;
      appState.historyPage = 1;
      renderAll();
    });
  }

  if (dateToInput) {
    dateToInput.addEventListener("change", (event) => {
      appState.dateTo = event.currentTarget.value;
      appState.period = "Semua Riwayat";
      if (periodSelect) periodSelect.value = appState.period;
      appState.historyPage = 1;
      renderAll();
    });
  }

  if (pagination) {
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-page]");

      if (!button || button.disabled) {
        return;
      }

      appState.historyPage = Number(button.dataset.historyPage);
      renderHistory();
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportCsv);
  }

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", exportExcel);
  }
}

function statusClass(status) {
  return statusClassMap[status] || "normal";
}

function renderLatest() {
  if (!appState.isLoaded) {
    setText('[data-field="humidity"]', "Memuat...");
    setText('[data-field="updated"]', "Memuat data...");
    setText('[data-field="adc"]', "Memuat...");
    setText('[data-field="status"]', "Memuat...");
    setText('[data-field="recommendation"]', "Memuat...");
    setText('[data-field="device"]', "Memuat...");
    setById("statusHint", "Memuat kondisi...");
    setById("alertHeadingText", "Status Kondisi");
    setById("alertTitle", "Memuat status...");
    setById("alertText", "Menunggu data terbaru dari sensor.");
    setHtml("monitoringInsight", `
      <div class="table-state">Memuat insight kondisi tanah...</div>
    `);
    return;
  }

  const currentStatusClass = statusClass(latest.status);
  const currentInfo = statusInfo[latest.status] || statusInfo.Normal;

  setText('[data-field="humidity"]', `${latest.moisture}%`);
  setText('[data-field="updated"]', `Update terakhir: ${formatTime(latest.timestamp)}`);
  setText('[data-field="adc"]', `ADC: ${latest.adc_value}`);
  setText('[data-field="status"]', latest.status);
  setText('[data-field="recommendation"]', latest.recommendation);
  setText('[data-field="device"]', latest.device_id);
  setById("statusHint", currentInfo.hint);
  setById("alertHeadingText", latest.status === "Normal" ? "Status Kondisi" : "Peringatan");
  setById("alertTitle", currentInfo.title);
  setById("alertText", currentInfo.text);
  renderInsight();

  const statusAlert = document.getElementById("statusAlert");
  if (statusAlert) {
    statusAlert.classList.remove("alert-dry", "alert-normal", "alert-wet");
    statusAlert.classList.add(`alert-${currentStatusClass}`);
  }

  document.querySelectorAll(".status-card, .recommendation-card").forEach((card) => {
    card.classList.remove("status-dry", "status-normal", "status-wet");
    card.classList.add(`status-${currentStatusClass}`);
  });

  const gauge = document.getElementById("humidityGauge");

  if (gauge) {
    const gaugeColor = {
      dry: "#ef4444",
      normal: "#07822e",
      wet: "#0967c9"
    }[currentStatusClass];

    gauge.style.setProperty("--value", latest.moisture);
    gauge.style.setProperty("--gauge-color", gaugeColor);
  }
}

function renderInsight() {
  if (!latest || !appState.isLoaded) {
    setHtml("monitoringInsight", `
      <div class="table-state">Memuat insight kondisi tanah...</div>
    `);
    return;
  }

  const status = latest.status;
  const moistureLabel = `${latest.moisture}%`;
  const description = {
    Kering: `Kelembapan ${moistureLabel} menunjukkan kondisi tanah kering. Segera siram secara manual untuk mencegah stres pada tanaman cabai.`,
    Normal: `Kelembapan ${moistureLabel} berada dalam rentang ideal untuk pertumbuhan tanaman cabai. Tidak perlu menyiram tambahan saat ini.`,
    "Terlalu basah": `Kelembapan ${moistureLabel} menunjukkan tanah terlalu basah. Tunda penyiraman dan pastikan drainase baik.`
  }[status] || `Kelembapan ${moistureLabel} berada dalam kondisi ${status.toLowerCase()}.`;

  const riskText = status === "Normal" ? "rendah" : status === "Kering" ? "tinggi" : "sedang";

  setHtml("monitoringInsight", `
    <div class="insight-copy">
      <p><strong>Status Saat Ini:</strong> ${status}</p>
      <p>${description}</p>
      <p>Risiko kekeringan dan kelebihan air relatif ${riskText}.</p>
    </div>
  `);
}

function renderCategories() {
  const html = categoryData.map((category) => `
    <div class="category ${category.className}">
      <div>
        <strong>${category.label}</strong>
        <span>${category.description}</span>
      </div>
      <em>${category.range}</em>
    </div>
  `).join("");

  document.querySelectorAll("[data-category-list]").forEach((list) => {
    list.innerHTML = html;
  });
}

function tableRows(rows, includeAdc = false) {
  return rows.slice().reverse().map((item) => `
    <tr>
      <td>${formatTime(item.timestamp)}</td>
      ${includeAdc ? `<td>${item.adc_value}</td>` : ""}
      <td>${item.moisture}%</td>
      <td><span class="status-badge ${statusClass(item.status)}">${item.status}</span></td>
      <td>${item.recommendation}</td>
    </tr>
  `).join("");
}

function renderTables() {
  setHtml("dashboardHistory", tableRows(readings.slice(-5)));
  renderHistory();
}

function renderSensorStats() {
  const rows = [
    ["Nilai ADC", latest.adc_value, "Nilai analog dari sensor"],
    ["Kelembapan", `${latest.moisture}%`, "Hasil konversi ADC"],
    ["Status", latest.status, "Kondisi tanah saat ini"],
    ["Waktu", formatTime(latest.timestamp), "Waktu data diterima"]
  ];

  setHtml("sensorStats", rows.map((row) => `
    <tr>
      <td>${row[0]}</td>
      <td><strong>${row[1]}</strong></td>
      <td>${row[2]}</td>
    </tr>
  `).join(""));
}

function renderSummary() {
  const stats = getStats();
  const selectedGraphReadings = graphReadings();
  const chartStats = getStatsFor(selectedGraphReadings);

  setById("averageCard", `${stats.average}%`);
  setById("totalData", readings.length);
  setById("lastReading", `${latest.moisture}%`);
  setById("lastReadingTime", `Update terakhir, ${formatTime(latest.timestamp)}`);
  setById("historyAverage", `${stats.average}%`);

  setHtml("chartSummary", `
    <div><span>Data Ditampilkan</span><strong>${selectedGraphReadings.length}</strong></div>
    <div><span>Nilai Tertinggi</span><strong>${chartStats.max}%</strong></div>
    <div><span>Nilai Terendah</span><strong>${chartStats.min}%</strong></div>
    <div><span>Rata-rata</span><strong>${chartStats.average}%</strong></div>
  `);

  setHtml("historySummary", `
    <div><span>Maksimum</span><strong>${stats.max}%</strong></div>
    <div><span>Minimum</span><strong>${stats.min}%</strong></div>
    <div><span>Rata-rata</span><strong>${stats.average}%</strong></div>
  `);

  setHtml("interpretationList", `
    <li>Grafik membantu melihat tren kelembapan tanah.</li>
    <li>Nilai ${latest.moisture}% menunjukkan tanah dalam kondisi ${latest.status.toLowerCase()}.</li>
    <li>Lakukan penyiraman manual saat nilai berada di bawah 30%.</li>
  `);
}

function makeChart(canvasId, chartReadings = readings) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || !window.Chart) {
    return null;
  }

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: chartReadings.map((item) => formatTime(item.timestamp)),
      datasets: [
        {
          label: "Kelembapan",
          data: chartReadings.map((item) => item.moisture),
          borderColor: "#07822e",
          backgroundColor: "rgba(18, 147, 59, 0.18)",
          borderWidth: 3,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#07822e",
          tension: 0.35
        },
        {
          label: "Batas Kering 30%",
          data: chartReadings.map(() => 30),
          borderColor: "#d97706",
          borderDash: [6, 6],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: "Batas Basah 70%",
          data: chartReadings.map(() => 70),
          borderColor: "#2563eb",
          borderDash: [6, 6],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.dataset.label === "Kelembapan") {
                return `Kelembapan: ${context.parsed.y}%`;
              }
              return null;
            },
            afterBody: (context) => {
              const index = context[0]?.dataIndex;
              const item = chartReadings[index];
              if (!item) return "";
              return [`ADC: ${item.adc_value}`, `Status: ${item.status}`];
            }
          },
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "#f8fafc",
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 1
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: (value) => `${value}%` },
          grid: {
            color: "rgba(15, 23, 42, 0.08)"
          }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderCharts() {
  if (dashboardChart) {
    dashboardChart.destroy();
  }

  if (mainChart) {
    mainChart.destroy();
  }

  dashboardChart = makeChart("dashboardChart", readings.slice(-8));
  mainChart = makeChart("mainChart", graphReadings());
}

function initGraphControls() {
  const graphRangeSelect = document.getElementById("graphRange");

  if (!graphRangeSelect) {
    return;
  }

  graphRangeSelect.value = appState.graphRange;
  graphRangeSelect.addEventListener("change", (event) => {
    appState.graphRange = event.currentTarget.value;
    renderSummary();
    renderCharts();
  });
}

function renderAll() {
  if (!readings.length) {
    readings = [latest];
  }

  latest = latest || readings[readings.length - 1];
  appState.isLoaded = true;

  setConnectionLabel();
  renderLatest();
  renderStatusIndicators();
  renderCategories();
  renderTables();
  renderSensorStats();
  renderSummary();
  renderCharts();
}

function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".nav-menu");
  const links = Array.from(document.querySelectorAll("[data-section]"));
  const views = Array.from(document.querySelectorAll(".view"));

  function showView(sectionId) {
    const target = document.getElementById(sectionId) || document.getElementById("dashboard");

    views.forEach((view) => view.classList.toggle("active", view.id === target.id));
    links.forEach((link) => link.classList.toggle("active", link.dataset.section === target.id));

    document.title = `SoilCare Cabai - ${target.dataset.title}`;
    window.scrollTo({ top: 0, behavior: "smooth" });

    window.setTimeout(() => {
      dashboardChart?.resize();
      mainChart?.resize();
    }, 80);
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-section]");

    if (!link) {
      return;
    }

    event.preventDefault();
    window.location.hash = link.dataset.section;
    showView(link.dataset.section);
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    const link = event.target.closest('[data-section][role="link"]');

    if (!link || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    window.location.hash = link.dataset.section;
    showView(link.dataset.section);
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });

  window.addEventListener("hashchange", () => {
    showView(window.location.hash.replace("#", "") || "dashboard");
  });

  showView(window.location.hash.replace("#", "") || "dashboard");
}

function setConnectionLabel() {
  const deviceOnline = isDeviceOnline();
  const label = deviceOnline ? "Sistem Online" : "Sistem Offline";

  document.querySelectorAll(".online-badge").forEach((badge) => {
    badge.innerHTML = `<span></span>${label}`;
    badge.classList.toggle("offline", !deviceOnline);
  });
}

function subscribeData() {
  let fallbackTimer = window.setTimeout(() => {
    if (!appState.isLoaded) {
      appState.isLoaded = true;
      renderAll();
    }
  }, 1200);

  onValue(ref(database, ".info/connected"), (snapshot) => {
    appState.firebaseConnected = snapshot.val() === true;
    setConnectionLabel();
    renderStatusIndicators();
  });

  onValue(ref(database, "latest"), (snapshot) => {
    const value = snapshot.val();

    if (value) {
      latest = normalizeReading(value);
      appState.isLoaded = true;
      renderAll();
      window.clearTimeout(fallbackTimer);
    }
  });

  onValue(ref(database, "readings"), (snapshot) => {
    const value = snapshot.val();

    if (!value) {
      return;
    }

    readings = Object.values(value)
      .map(normalizeReading)
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    latest = readings[readings.length - 1];
    appState.isLoaded = true;
    renderAll();
    window.clearTimeout(fallbackTimer);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setConnectionLabel();
  window.addEventListener("online", () => {
    setConnectionLabel();
    renderStatusIndicators();
  });
  window.addEventListener("offline", () => {
    setConnectionLabel();
    renderStatusIndicators();
  });
  initNavigation();
  initHistoryControls();
  initGraphControls();
  renderLoadingState();
  subscribeData();

  window.setInterval(() => {
    setConnectionLabel();
    renderStatusIndicators();
  }, 15000);
});
