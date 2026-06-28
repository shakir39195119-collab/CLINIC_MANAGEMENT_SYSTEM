const api = {
  token: localStorage.getItem("clinic_token") || "",
  user: JSON.parse(localStorage.getItem("clinic_user") || "null"),
  async request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.message || "Request failed");
    return data;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: "POST", body: JSON.stringify(body) }); },
  patch(path, body) { return this.request(path, { method: "PATCH", body: JSON.stringify(body) }); }
};

const state = {
  catalog: { departments: [], doctors: [], services: [], blogs: [], faqs: [] },
  dashboard: null
};

const sampleAccounts = {
  admin: ["admin@clinic.test", "Admin@12345"],
  doctor: ["doctor@clinic.test", "Doctor@12345"],
  receptionist: ["reception@clinic.test", "Reception@12345"],
  patient: ["patient@clinic.test", "Patient@12345"]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 3200);
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function renderCatalog() {
  const { departments, doctors, services, blogs, faqs } = state.catalog;
  const departmentFilter = $("#departmentFilter");
  const activeDepartment = departmentFilter.value;
  const query = $("#serviceSearch").value.trim().toLowerCase();

  if (!departmentFilter.dataset.ready) {
    departmentFilter.innerHTML = `<option value="">All departments</option>${departments.map((department) => `<option value="${department.id}">${department.name}</option>`).join("")}`;
    departmentFilter.dataset.ready = "true";
  }

  $("#appointmentDoctor").innerHTML = doctors.map((doctor) => {
    const department = byId(departments, doctor.departmentId);
    return `<option value="${doctor.id}">${doctor.name} - ${department?.name || "Clinic"}</option>`;
  }).join("");

  const visibleServices = services.filter((service) => {
    const doctor = byId(doctors, service.doctorId);
    const departmentMatch = !activeDepartment || service.id === activeDepartment;
    const text = `${service.name} ${service.description} ${doctor?.name || ""}`.toLowerCase();
    return departmentMatch && (!query || text.includes(query));
  });

  $("#serviceGrid").innerHTML = visibleServices.map((service) => {
    const doctor = byId(doctors, service.doctorId);
    return `
      <article class="service-card">
        <div class="badges"><span class="badge">${service.duration}</span><span class="badge">${money(service.price)}</span></div>
        <h3>${service.name}</h3>
        <p>${service.description}</p>
        <p class="meta">Doctor: ${doctor?.name || "Available staff"}</p>
        <a class="secondary-button compact" href="#appointment" data-book-doctor="${doctor?.id || ""}">Book</a>
      </article>
    `;
  }).join("");

  $("#doctorGrid").innerHTML = doctors
    .filter((doctor) => !activeDepartment || doctor.departmentId === activeDepartment)
    .filter((doctor) => !query || `${doctor.name} ${doctor.bio} ${doctor.qualification}`.toLowerCase().includes(query))
    .map((doctor) => {
      const department = byId(departments, doctor.departmentId);
      return `
        <article class="doctor-card">
          <div>
            <h3>${doctor.name}</h3>
            <p>${doctor.qualification} - ${doctor.experience} years</p>
          </div>
          <p>${doctor.bio}</p>
          <div class="badges">
            <span class="badge">${department?.name || "Clinic"}</span>
            <span class="badge">${doctor.rating} rating</span>
            <span class="badge">${money(doctor.fee)}</span>
          </div>
          <a class="primary-button compact" href="#appointment" data-book-doctor="${doctor.id}">Book Appointment</a>
        </article>
      `;
    }).join("");

  $("#blogList").innerHTML = blogs.map((blog) => `
    <article class="blog-item">
      <strong>${blog.title}</strong>
      <p>${blog.excerpt}</p>
      <span class="badge">${blog.category}</span>
    </article>
  `).join("");

  $("#faqList").innerHTML = faqs.map((faq) => `
    <details class="faq-item">
      <summary><strong>${faq.question}</strong></summary>
      <p>${faq.answer}</p>
    </details>
  `).join("");

  $("#publicStats").innerHTML = [
    ["Doctors", doctors.length],
    ["Services", services.length],
    ["Departments", departments.length]
  ].map(([label, value]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderSession() {
  const user = api.user;
  $("#sessionCard").innerHTML = user
    ? `<p class="eyebrow">Signed in</p><h3>${user.name}</h3><p>${user.email}</p><span class="badge">${user.role}</span><button class="secondary-button compact" id="logoutButton">Sign out</button>`
    : `<p class="eyebrow">Demo access</p><h3>No active session</h3><p>Use a sample role or sign in to load role-specific dashboard data.</p>`;

  $("#loginOpen").textContent = user ? user.role : "Sign in";
  $("#logoutButton")?.addEventListener("click", () => {
    api.token = "";
    api.user = null;
    localStorage.removeItem("clinic_token");
    localStorage.removeItem("clinic_user");
    renderSession();
    renderDashboard(null);
    toast("Signed out.");
  });
}

function dashboardAction(appointment) {
  if (!api.user) return "";
  if (["admin", "doctor", "receptionist"].includes(api.user.role) && appointment.status === "pending") {
    return `<button class="secondary-button compact" data-status="approved" data-id="${appointment.id}">Approve</button>`;
  }
  if (api.user.role === "patient" && appointment.paymentStatus !== "paid") {
    return `<button class="secondary-button compact" data-pay="${appointment.id}">Pay</button>`;
  }
  if (["admin", "doctor"].includes(api.user.role) && appointment.status === "approved") {
    return `<button class="secondary-button compact" data-status="completed" data-id="${appointment.id}">Complete</button>`;
  }
  return `<span class="meta">Updated</span>`;
}

function renderDashboard(data) {
  if (!data) {
    $("#dashboardStats").innerHTML = "";
    $("#appointmentsTable").innerHTML = `<p class="hint">Sign in to see appointments, prescriptions, payments, and analytics.</p>`;
    $("#analyticsBars").innerHTML = "";
    return;
  }

  const stats = [
    ["Doctors", data.stats.doctors],
    ["Patients", data.stats.patients],
    ["Appointments", data.stats.appointments],
    ["Upcoming", data.stats.upcoming],
    ["Revenue", money(data.stats.revenue)]
  ];
  $("#dashboardStats").innerHTML = stats.map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");

  $("#appointmentsTable").innerHTML = `
    <table>
      <thead>
        <tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th><th>Payment</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${data.appointments.map((appointment) => {
          const doctor = byId(state.catalog.doctors, appointment.doctorId);
          return `
            <tr>
              <td>${appointment.patientName}<br><span class="meta">${appointment.symptoms || ""}</span></td>
              <td>${doctor?.name || appointment.doctorId}</td>
              <td>${appointment.date}<br>${appointment.time}</td>
              <td><span class="status ${appointment.status}">${appointment.status}</span></td>
              <td><span class="status ${appointment.paymentStatus}">${appointment.paymentStatus}</span></td>
              <td>${dashboardAction(appointment)}</td>
            </tr>
          `;
        }).join("") || `<tr><td colspan="6">No appointments yet.</td></tr>`}
      </tbody>
    </table>
  `;

  const max = Math.max(1, ...data.charts.status.map((row) => row.value));
  $("#analyticsBars").innerHTML = data.charts.status.map((row) => `
    <div class="bar-row">
      <span>${row.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(row.value / max) * 100}%"></span></span>
      <strong>${row.value}</strong>
    </div>
  `).join("");

  $$("[data-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api.patch(`/api/appointments/${button.dataset.id}/status`, { status: button.dataset.status });
        toast(`Appointment ${button.dataset.status}.`);
        await loadDashboard();
      } catch (error) {
        toast(error.message);
      }
    });
  });

  $$("[data-pay]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api.post("/api/payments/create", { appointmentId: button.dataset.pay });
        toast("Payment recorded.");
        await loadDashboard();
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

async function login(email, password) {
  const data = await api.post("/api/auth/login", { email, password });
  api.token = data.accessToken;
  api.user = data.user;
  localStorage.setItem("clinic_token", api.token);
  localStorage.setItem("clinic_user", JSON.stringify(api.user));
  renderSession();
  await loadDashboard();
}

async function loadDashboard() {
  if (!api.token) {
    renderDashboard(null);
    return;
  }
  state.dashboard = await api.get("/api/dashboard");
  renderDashboard(state.dashboard);
}

async function bookAppointment(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  if (!api.token) {
    await login("patient@clinic.test", "Patient@12345");
  }
  await api.post("/api/appointments", values);
  form.reset();
  toast("Appointment submitted. Confirmation notification queued.");
  await loadDashboard();
}

function bindUi() {
  $("#themeToggle").textContent = "Mode";
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("clinic_theme", next);
  });

  $("#loginOpen").addEventListener("click", () => $("#loginModal").classList.add("open"));
  $("#loginClose").addEventListener("click", () => $("#loginModal").classList.remove("open"));
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await login(values.email, values.password);
      $("#loginModal").classList.remove("open");
      toast("Signed in.");
    } catch (error) {
      toast(error.message);
    }
  });

  $(".sample-logins").addEventListener("click", async (event) => {
    const role = event.target.dataset.login;
    if (!role) return;
    const [email, password] = sampleAccounts[role];
    try {
      await login(email, password);
      toast(`Signed in as ${role}.`);
    } catch (error) {
      toast(error.message);
    }
  });

  $("#appointmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await bookAppointment(event.currentTarget);
    } catch (error) {
      toast(error.message);
    }
  });

  $("#serviceSearch").addEventListener("input", renderCatalog);
  $("#departmentFilter").addEventListener("change", renderCatalog);
  $("#refreshDashboard").addEventListener("click", loadDashboard);

  document.body.addEventListener("click", (event) => {
    const book = event.target.closest("[data-book-doctor]");
    if (book?.dataset.bookDoctor) {
      $("#appointmentDoctor").value = book.dataset.bookDoctor;
    }
  });
}

async function init() {
  document.documentElement.dataset.theme = localStorage.getItem("clinic_theme") || "light";
  bindUi();
  renderSession();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  $("input[name='date']").min = tomorrow;
  $("input[name='date']").value = tomorrow;
  state.catalog = await api.get("/api/catalog");
  renderCatalog();
  await loadDashboard();
}

init().catch((error) => {
  console.error(error);
  toast(error.message);
});
