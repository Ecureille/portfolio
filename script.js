const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setYear() {
  const year = new Date().getFullYear();
  const el = $("#year");
  if (el) el.textContent = String(year);
}

function setupMobileMenu() {
  const header = $(".header");
  const toggle = $(".nav__toggle");
  const menu = $("#navMenu");
  if (!header || !toggle || !menu) return;

  const setOpen = (open) => {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  };

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.contains("is-open");
    setOpen(!isOpen);
  });

  document.addEventListener("click", (e) => {
    if (!header.classList.contains("is-open")) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    const inside = header.contains(target);
    if (!inside) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  $$(".nav__link", menu).forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });
}

function setupActiveNav() {
  const links = $$(".nav__link");
  if (!links.length) return;

  const normalizePath = (path) => {
    const p = (path || "").split("?")[0].split("#")[0];
    const last = p.split("/").filter(Boolean).pop() || "index.html";
    return last.toLowerCase();
  };

  const current = normalizePath(window.location.pathname);

  const markActive = (href) => {
    links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === href));
  };

  // Multi-pages: mark current page active.
  const pageLink = links.find((a) => {
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return false;
    return normalizePath(href) === current;
  });
  if (pageLink) {
    markActive(pageLink.getAttribute("href") || "");
    return;
  }

  // Single page fallback: active section with IntersectionObserver.
  const sectionLinks = links
    .map((a) => a.getAttribute("href"))
    .filter((href) => href && href.startsWith("#"));
  const sections = sectionLinks.map((href) => document.querySelector(href)).filter(Boolean);
  if (!sections.length) return;

  const setActiveById = (id) => {
    links.forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("is-active", href === `#${id}`);
    });
  };

  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
      if (visible?.target?.id) setActiveById(visible.target.id);
    },
    { threshold: [0.2, 0.35, 0.5], rootMargin: "-30% 0px -60% 0px" }
  );

  sections.forEach((s) => obs.observe(s));
  setActiveById(sections[0].id);
}

function setupProjectModal() {
  const modal = $("#projectModal");
  const overlay = $("#projectModalOverlay");
  const closeBtn = $("#projectModalClose");
  const title = $("#projectModalTitle");
  const badge = $("#projectModalBadge");
  const desc = $("#projectModalDesc");
  const details = $("#projectModalDetails");
  const tech = $("#projectModalTech");
  const links = $("#projectModalLinks");

  if (!modal || !overlay || !closeBtn || !title || !desc || !details || !tech || !links) return;

  let lastActive = null;

  const setOpen = (open) => {
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", String(!open));
    document.documentElement.classList.toggle("is-locked", open);
    if (open) {
      lastActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeBtn.focus();
    } else {
      lastActive?.focus?.();
      lastActive = null;
    }
  };

  const fill = (data) => {
    title.textContent = data.title || "Projet";
    desc.textContent = data.desc || "";
    if (badge) {
      badge.textContent = data.badge || "";
      badge.hidden = !data.badge;
    }

    details.innerHTML = "";
    (data.details || []).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      details.appendChild(li);
    });

    tech.innerHTML = "";
    (data.tech || []).forEach((t) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      tech.appendChild(span);
    });

    links.innerHTML = "";
    (data.links || []).forEach((l) => {
      const a = document.createElement("a");
      a.className = "link";
      a.href = l.href || "#";
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      a.textContent = l.label || "Lien";
      links.appendChild(a);
    });
    links.hidden = !links.childElementCount;
  };

  const parseData = (el) => {
    const raw = el.getAttribute("data-project") || "";
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  $$(".project__link[data-project]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const data = parseData(a);
      fill(data);
      setOpen(true);
    });
  });

  closeBtn.addEventListener("click", () => setOpen(false));
  overlay.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

function setupContactForm() {
  const form = $("#contactForm");
  const status = $("#formStatus");
  if (!(form instanceof HTMLFormElement)) return;

  const fieldFor = (id) => {
    const input = $(`#${id}`, form);
    const hint = form.querySelector(`[data-for="${id}"]`);
    const field = input?.closest(".field");
    return { input, hint, field };
  };

  const validators = {
    name: (value) => (value.trim().length >= 2 ? "" : "Minimum 2 caractères."),
    email: (value) => {
      const v = value.trim();
      if (!v) return "Email requis.";
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      return ok ? "" : "Format d'email invalide.";
    },
    subject: (value) => (value.trim().length >= 3 ? "" : "Minimum 3 caractères."),
    message: (value) => (value.trim().length >= 10 ? "" : "Minimum 10 caractères."),
  };

  const show = (id, msg) => {
    const { input, hint, field } = fieldFor(id);
    if (hint) hint.textContent = msg || "";
    if (field) field.classList.toggle("is-invalid", Boolean(msg));
    if (input instanceof HTMLElement) input.setAttribute("aria-invalid", msg ? "true" : "false");
  };

  const validateOne = (id) => {
    const { input } = fieldFor(id);
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return true;
    const msg = validators[id]?.(input.value) ?? "";
    show(id, msg);
    return !msg;
  };

  const validateAll = () => Object.keys(validators).every((id) => validateOne(id));

  Object.keys(validators).forEach((id) => {
    const { input } = fieldFor(id);
    if (!input) return;
    input.addEventListener("input", () => validateOne(id));
    input.addEventListener("blur", () => validateOne(id));
  });

  form.addEventListener("reset", () => {
    Object.keys(validators).forEach((id) => show(id, ""));
    if (status) status.textContent = "";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = validateAll();
    if (!ok) {
      if (status) status.textContent = "Veuillez corriger les champs en rouge.";
      const firstInvalid = $(".field.is-invalid input, .field.is-invalid textarea", form);
      firstInvalid?.focus?.();
      return;
    }

    if (status) status.textContent = "Envoi…";
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

    window.setTimeout(() => {
      if (status) status.textContent = "Message envoyé.";
      form.reset();
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }, 900);
  });
}

function setupBackToTop() {
  const links = $$(".footer__top");
  if (!links.length) return;

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "#top");
    });
  });
}

setYear();
setupMobileMenu();
setupActiveNav();
setupContactForm();
setupProjectModal();
setupBackToTop();

