const latestData = {
  device_id: "ESP32-CABAI-01",
  adc_value: 3300,
  kelembapan: 28,
  status: "Kering",
  rekomendasi: "Siram tanaman secara manual",
  waktu: "11.00 WIB"
};

const historyData = [
  {
    waktu: "08.00",
    adc_value: 2500,
    kelembapan: 45,
    status: "Normal",
    rekomendasi: "Tidak perlu menyiram"
  },
  {
    waktu: "09.00",
    adc_value: 2700,
    kelembapan: 38,
    status: "Normal",
    rekomendasi: "Tidak perlu menyiram"
  },
  {
    waktu: "10.00",
    adc_value: 3300,
    kelembapan: 28,
    status: "Kering",
    rekomendasi: "Siram tanaman secara manual"
  },
  {
    waktu: "11.00",
    adc_value: 1100,
    kelembapan: 75,
    status: "Terlalu basah",
    rekomendasi: "Hentikan penyiraman sementara"
  }
];

const statusClassMap = {
  Kering: "dry",
  Normal: "normal",
  "Terlalu basah": "wet"
};

const statusMessageMap = {
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

const categories = [
  { className: "dry", range: "0 - 30%", label: "Kering" },
  { className: "normal", range: "31 - 70%", label: "Normal" },
  { className: "wet", range: "71 - 100%", label: "Terlalu basah" }
];

let dashboardChart;
let mainChart;

function getStats(rows) {
  const values = rows.map((item) => item.kelembapan);
  const total = values.reduce((sum, value) => sum + value, 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const average = Math.floor(total / values.length);

  return { max, min, average };
}

function getStatusClass(status) {
  return statusClassMap[status] || "normal";
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function applyLatestData() {
  const statusClass = getStatusClass(latestData.status);

  setText('[data-field="humidity"]', `${latestData.kelembapan}%`);
  setText('[data-field="updated"]', `Update terakhir: ${latestData.waktu}`);
  setText('[data-field="adc"]', `ADC: ${latestData.adc_value}`);
  setText('[data-field="status"]', latestData.status);
  setText('[data-field="recommendation"]', latestData.rekomendasi);
  setText('[data-field="device"]', latestData.device_id);

  document.querySelectorAll(".status-card, .recommendation-card").forEach((card) => {
    card.classList.remove("status-dry", "status-normal", "status-wet");
    card.classList.add(`status-${statusClass}`);
  });

  const gauge = document.getElementById("humidityGauge");
  if (gauge) {
    const gaugeColor = {
      dry: "#ef4444",
      normal: "#07822e",
      wet: "#0967c9"
    }[statusClass];

    gauge.style.setProperty("--value", latestData.kelembapan);
    gauge.style.setProperty("--gauge-color", gaugeColor);
  }

  document.getElementById("statusHint").textContent = statusMessageMap[latestData.status].hint;
  document.getElementById("alertTitle").textContent = statusMessageMap[latestData.status].title;
  document.getElementById("alertText").textContent = statusMessageMap[latestData.status].text;
}

function renderCategories() {
  const html = categories.map((category) => `
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

function renderDashboardHistory() {
  const tbody = document.getElementById("dashboardHistory");

  tbody.innerHTML = historyData.map((item) => `
    <tr>
      <td>${item.waktu}</td>
      <td>${item.kelembapan}%</td>
      <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
      <td>${item.rekomendasi}</td>
    </tr>
  `).join("");
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTable");

  tbody.innerHTML = historyData.map((item) => `
    <tr>
      <td>${item.waktu}</td>
      <td>${item.adc_value}</td>
      <td>${item.kelembapan}%</td>
      <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
      <td>${item.rekomendasi}</td>
    </tr>
  `).join("");
}

function renderSensorStats() {
  const rows = [
    ["Nilai ADC", latestData.adc_value, "Nilai analog dari sensor"],
    ["Kelembapan", `${latestData.kelembapan}%`, "Hasil konversi ADC"],
    ["Status", latestData.status, "Kondisi tanah saat ini"],
    ["Waktu", latestData.waktu, "Waktu data diterima"]
  ];

  document.getElementById("sensorStats").innerHTML = rows.map((row) => `
    <tr>
      <td>${row[0]}</td>
      <td><strong>${row[1]}</strong></td>
      <td>${row[2]}</td>
    </tr>
  `).join("");
}

function renderSummaries() {
  const stats = getStats(historyData);
  const lastItem = historyData[historyData.length - 1];

  document.getElementById("averageCard").textContent = `${stats.average}%`;
  document.getElementById("totalData").textContent = historyData.length;
  document.getElementById("lastReading").textContent = `${lastItem.kelembapan}%`;
  document.getElementById("lastReadingTime").textContent = `Hari ini, ${lastItem.waktu} WIB`;
  document.getElementById("historyAverage").textContent = `${stats.average}%`;

  document.getElementById("chartSummary").innerHTML = `
    <div><span>Nilai Tertinggi</span><strong>${stats.max}%</strong></div>
    <div><span>Nilai Terendah</span><strong>${stats.min}%</strong></div>
    <div><span>Rata-rata</span><strong>${stats.average}%</strong></div>
    <div><span>Update Terakhir</span><strong>${latestData.waktu}</strong></div>
  `;

  document.getElementById("historySummary").innerHTML = `
    <div><span>Maksimum</span><strong>${stats.max}%</strong></div>
    <div><span>Minimum</span><strong>${stats.min}%</strong></div>
    <div><span>Rata-rata</span><strong>${stats.average}%</strong></div>
  `;

  document.getElementById("interpretationList").innerHTML = `
    <li>Grafik membantu melihat tren kelembapan tanah.</li>
    <li>Nilai ${latestData.kelembapan}% menunjukkan tanah dalam kondisi ${latestData.status.toLowerCase()}.</li>
    <li>Lakukan penyiraman manual saat nilai berada di bawah 30%.</li>
  `;
}

function createLineChart(canvasId) {
  const canvas = document.getElementById(canvasId);

  if (!window.Chart || !canvas) {
    return null;
  }

  const gradient = canvas.getContext("2d").createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(18, 147, 59, 0.22)");
  gradient.addColorStop(1, "rgba(18, 147, 59, 0)");

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: historyData.map((item) => item.waktu),
      datasets: [
        {
          label: "Kelembapan",
          data: historyData.map((item) => item.kelembapan),
          borderColor: "#07822e",
          backgroundColor: gradient,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#07822e",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 3,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `Kelembapan: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`
          },
          title: {
            display: true,
            text: "Kelembapan (%)",
            color: "#344054",
            font: {
              weight: 700
            }
          },
          grid: {
            color: "#e3e9e3"
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".nav-menu");
  const links = Array.from(document.querySelectorAll("[data-section]"));
  const views = Array.from(document.querySelectorAll(".view"));

  function showView(sectionId) {
    const target = document.getElementById(sectionId) || document.getElementById("dashboard");

    views.forEach((view) => {
      view.classList.toggle("active", view.id === target.id);
    });

    links.forEach((link) => {
      link.classList.toggle("active", link.dataset.section === target.id);
    });

    document.title = `SoilCare Cabai - ${target.dataset.title}`;
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (target.id === "dashboard" && dashboardChart) {
      window.setTimeout(() => dashboardChart.resize(), 80);
    }

    if (target.id === "grafik" && mainChart) {
      window.setTimeout(() => mainChart.resize(), 80);
    }
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

    const sectionId = link.dataset.section;
    window.location.hash = sectionId;
    showView(sectionId);
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });

  window.addEventListener("hashchange", () => {
    showView(window.location.hash.replace("#", "") || "dashboard");
  });

  showView(window.location.hash.replace("#", "") || "dashboard");
}

function initDashboard() {
  applyLatestData();
  renderCategories();
  renderDashboardHistory();
  renderHistoryTable();
  renderSensorStats();
  renderSummaries();
  initNavigation();
  dashboardChart = createLineChart("dashboardChart");
  mainChart = createLineChart("mainChart");
}

document.addEventListener("DOMContentLoaded", initDashboard);
