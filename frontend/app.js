import { database } from "./firebase.js";
import {
  ref,
  onValue,
  query,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const demoReadings = [
  { timestamp: "2026-06-08 08:00:00", adc_value: 2500, moisture: 45 },
  { timestamp: "2026-06-08 09:00:00", adc_value: 2700, moisture: 38 },
  { timestamp: "2026-06-08 10:00:00", adc_value: 3300, moisture: 28 },
  { timestamp: "2026-06-08 11:00:00", adc_value: 1100, moisture: 75 }
];

const categoryData = [
  { className: "dry", range: "0 - 30%", label: "Kering" },
  { className: "normal", range: "31 - 70%", label: "Normal" },
  { className: "wet", range: "71 - 100%", label: "Terlalu basah" }
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
  filterStatus: "Semua Status",
  searchQuery: "",
  period: "24 Jam Terakhir"
};

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

function getStats() {
  const values = readings.map((item) => item.moisture);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    max: Math.max(...values),
    min: Math.min(...values),
    average: Math.round(total / values.length)
  };
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
  setById("alertTitle", loadingText);
  setById("alertText", "Mohon tunggu sambungan Firebase.");
  setById("averageCard", loadingText);
  setById("totalData", loadingText);
  setById("lastReading", loadingText);
  setById("lastReadingTime", loadingText);
  setById("historyAverage", loadingText);
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

  return readings.filter((item) => {
    const matchesStatus = appState.filterStatus === "Semua Status" || item.status === appState.filterStatus;
    const matchesSearch = !query || [
      formatTime(item.timestamp),
      item.status,
      item.recommendation,
      String(item.adc_value)
    ].some((value) => String(value).toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
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

function renderHistory() {
  if (!appState.isLoaded) {
    setHtml("historyTable", '<tr><td colspan="5" class="table-state">Memuat riwayat...</td></tr>');
    return;
  }

  const filtered = getFilteredReadings();

  if (!filtered.length) {
    setHtml("historyTable", '<tr><td colspan="5" class="table-state">Belum ada data riwayat untuk filter saat ini.</td></tr>');
    return;
  }

  setHtml("historyTable", tableRows(filtered, true));
}

function renderStatusIndicators() {
  if (!appState.isLoaded) {
    setById("systemStatus", "Memuat...");
    setById("connectionStatus", navigator.onLine ? "Sensor Terhubung" : "Koneksi Terputus");
    setById("firebaseStatus", "Memeriksa database...");
    setById("lastUpdateStatus", "--");
    return;
  }

  setById("systemStatus", latest ? "Sistem Online" : "Sistem Offline");
  setById("connectionStatus", navigator.onLine ? "Sensor Terhubung" : "Koneksi Terputus");
  setById("firebaseStatus", "Database Aktif");
  setById("lastUpdateStatus", latest ? formatTime(latest.timestamp) : "--");
}

function initHistoryControls() {
  const searchInput = document.getElementById("historySearch");
  const statusSelect = document.getElementById("historyStatus");
  const periodSelect = document.getElementById("historyPeriod");
  const exportCsvBtn = document.getElementById("exportCsv");
  const exportExcelBtn = document.getElementById("exportExcel");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      appState.searchQuery = event.currentTarget.value;
      renderAll();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", (event) => {
      appState.filterStatus = event.currentTarget.value;
      renderAll();
    });
  }

  if (periodSelect) {
    periodSelect.addEventListener("change", (event) => {
      appState.period = event.currentTarget.value;
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
  setById("alertTitle", currentInfo.title);
  setById("alertText", currentInfo.text);
  renderInsight();

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
      <span class="category-dot"></span>
      <span>${category.range}</span>
      <strong>${category.label}</strong>
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

  setById("averageCard", `${stats.average}%`);
  setById("totalData", readings.length);
  setById("lastReading", `${latest.moisture}%`);
  setById("lastReadingTime", `Update terakhir, ${formatTime(latest.timestamp)}`);
  setById("historyAverage", `${stats.average}%`);

  setHtml("chartSummary", `
    <div><span>Nilai Tertinggi</span><strong>${stats.max}%</strong></div>
    <div><span>Nilai Terendah</span><strong>${stats.min}%</strong></div>
    <div><span>Rata-rata</span><strong>${stats.average}%</strong></div>
    <div><span>Update Terakhir</span><strong>${formatTime(latest.timestamp)}</strong></div>
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

function makeChart(canvasId) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || !window.Chart) {
    return null;
  }

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: readings.map((item) => formatTime(item.timestamp)),
      datasets: [
        {
          label: "Kelembapan",
          data: readings.map((item) => item.moisture),
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
          data: readings.map(() => 30),
          borderColor: "#d97706",
          borderDash: [6, 6],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        {
          label: "Batas Basah 70%",
          data: readings.map(() => 70),
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
              const item = readings[index];
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

  dashboardChart = makeChart("dashboardChart");
  mainChart = makeChart("mainChart");
}

function renderAll() {
  if (!readings.length) {
    readings = [latest];
  }

  latest = latest || readings[readings.length - 1];
  appState.isLoaded = true;

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
  const label = navigator.onLine ? "Sistem Online" : "Sistem Offline";

  document.querySelectorAll(".online-badge").forEach((badge) => {
    badge.innerHTML = `<span></span>${label}`;
  });
}

function subscribeData() {
  let fallbackTimer = window.setTimeout(() => {
    if (!appState.isLoaded) {
      appState.isLoaded = true;
      renderAll();
    }
  }, 1200);

  onValue(ref(database, "latest"), (snapshot) => {
    const value = snapshot.val();

    if (value) {
      latest = normalizeReading(value);
      appState.isLoaded = true;
      renderAll();
      window.clearTimeout(fallbackTimer);
    }
  });

  onValue(query(ref(database, "readings"), limitToLast(20)), (snapshot) => {
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
  renderLoadingState();
  subscribeData();
});
