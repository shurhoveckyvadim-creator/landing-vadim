'use strict';

/* Приём заявок: Cloudflare Worker пересылает их в Telegram. Токен бота хранится только в Worker. */
const LEAD_ENDPOINT = 'https://long-union-6a9e.shyrhoveckyvadim.workers.dev/';
const LEAD_SOURCE = 'landing-vadim';
const LEAD_TIMEOUT_MS = 10000;
const TELEGRAM_USERNAME = 'illemmy';

/* Данные портфолио (PROJECTS) — в projects.js, подключается перед этим файлом */

/* ===== Цели Яндекс Метрики ===== */
const METRIKA_ID = 113864698;

// Только идентификатор цели — без значений полей, контактов и текста заявки.
// Если Метрика не загрузилась или упала, форма и переходы работают как обычно.
const reachGoal = (goal) => {
  try {
    if (typeof window.ym === 'function') window.ym(METRIKA_ID, 'reachGoal', goal);
  } catch {
    /* Метрика недоступна — цель пропускаем */
  }
};

// Клики по ссылкам на Telegram и ВКонтакте: один делегированный обработчик на всю страницу.
// Переход не задерживается — цель отправляется асинхронно самой Метрикой.
const LINK_GOALS = [
  { goal: 'telegram_click', hosts: ['t.me'] },
  { goal: 'vk_click', hosts: ['vk.ru', 'vk.com'] }
];

document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link) return;
  let host;
  try {
    host = new URL(link.href).hostname.replace(/^www\./, '');
  } catch {
    return;
  }
  const match = LINK_GOALS.find(({ hosts }) => hosts.includes(host));
  if (match) reachGoal(match.goal);
});

/* ===== Шапка: граница при прокрутке ===== */
(() => {
  const header = document.querySelector('.header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
})();

/* ===== Мягкое появление блоков ===== */
(() => {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach((el) => observer.observe(el));
})();

/* ===== Модальное окно проекта ===== */
(() => {
  const modal = document.getElementById('project-modal');
  if (!modal || typeof modal.showModal !== 'function' || typeof PROJECTS === 'undefined') return;

  const el = {
    desktop: document.getElementById('modal-desktop'),
    desktopWebp: document.getElementById('modal-desktop-webp'),
    mobile: document.getElementById('modal-mobile'),
    mobileWebp: document.getElementById('modal-mobile-webp'),
    url: document.getElementById('modal-url'),
    tags: document.getElementById('modal-tags'),
    title: document.getElementById('modal-title'),
    task: document.getElementById('modal-task'),
    done: document.getElementById('modal-done'),
    tech: document.getElementById('modal-tech'),
    link: document.getElementById('modal-link')
  };
  let lastTrigger = null;

  const fillList = (list, items, className) => {
    list.replaceChildren(...items.map((text, i) => {
      const li = document.createElement('li');
      li.textContent = text;
      if (className) li.className = i === 0 ? `${className} ${className}--accent` : className;
      return li;
    }));
  };

  const setPicture = (source, img, image) => {
    source.srcset = image.webp;
    img.src = image.jpg;
    img.alt = image.alt;
  };

  const open = (id, trigger) => {
    const project = PROJECTS[id];
    if (!project) return;
    setPicture(el.desktopWebp, el.desktop, project.desktop);
    setPicture(el.mobileWebp, el.mobile, project.mobile);
    el.url.textContent = project.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    fillList(el.tags, project.tags, 'tag');
    el.title.textContent = project.title;
    el.task.textContent = project.task;
    fillList(el.done, project.done);
    el.tech.textContent = project.tech;
    el.link.href = project.url;

    lastTrigger = trigger;
    modal.showModal();
    modal.querySelector('.modal__inner').scrollTop = 0;
    document.body.classList.add('is-locked');
  };

  document.querySelectorAll('[data-project]').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.dataset.project, btn));
  });

  // Крестик и ссылка «Обсудить похожий проект»
  modal.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => modal.close());
  });

  // Клик по фону: событие приходит на сам dialog, а не на его содержимое
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });

  // Esc закрывает dialog нативно; здесь только убираем блокировку и возвращаем фокус
  modal.addEventListener('close', () => {
    document.body.classList.remove('is-locked');
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  });
})();

/* ===== Тарифы: карусель и «Остальное» ===== */
(() => {
  const track = document.getElementById('tiers');
  const panels = [...document.querySelectorAll('.tier__more')];
  if (!track || !panels.length) return;

  // Карточки в несколько колонок (ПК) — «Остальное» открывается и закрывается во всех сразу,
  // чтобы их было удобно сравнивать. На телефоне каждая карточка открывается сама по себе.
  const isPhone = window.matchMedia('(max-width: 899px)');

  panels.forEach((panel) => {
    panel.addEventListener('toggle', () => {
      if (isPhone.matches) return;
      panels.forEach((other) => {
        if (other !== panel && other.open !== panel.open) other.open = panel.open;
      });
    });
  });

  // При переходе к ширине ПК выравниваем состояние: если хоть один список открыт — открываем все
  isPhone.addEventListener('change', () => {
    if (isPhone.matches) return;
    const anyOpen = panels.some((panel) => panel.open);
    panels.forEach((panel) => { panel.open = anyOpen; });
  });

  // ПК, «Остальное» раскрыто во всех карточках: дополнительные списки «Что входит» разной длины —
  // выравниваем их по самому длинному, чтобы линия «Что не входит» шла на одном уровне
  const extraLists = panels.map((panel) => panel.querySelector('.tier__more-body > .tier__list--in')).filter(Boolean);
  const equalizeExtras = () => {
    extraLists.forEach((list) => { list.style.minHeight = ''; });
    if (isPhone.matches || !panels.every((panel) => panel.open)) return;
    const tallest = Math.max(...extraLists.map((list) => list.offsetHeight));
    extraLists.forEach((list) => { list.style.minHeight = `${tallest}px`; });
  };
  panels.forEach((panel) => panel.addEventListener('toggle', equalizeExtras));
  isPhone.addEventListener('change', equalizeExtras);
  window.addEventListener('resize', equalizeExtras);

  // На телефоне «Остальное» открывается и закрывается касанием по блоку «Что входит».
  // Касание считается, только если палец почти не сдвинулся и ни страница, ни карусель
  // не прокрутились — так прокрутка и свайп карусели ничего не открывают и не закрывают.
  const TAP_TOLERANCE = 10;
  let start = null;

  // Любая прокрутка между касанием и кликом — это жест, а не нажатие.
  // Проверка по факту прокрутки, а не по итоговой позиции: карусель после свайпа
  // может «примагнититься» обратно к той же карточке.
  const markScrolled = () => { if (start) start.scrolled = true; };
  track.addEventListener('scroll', markScrolled, { passive: true });
  window.addEventListener('scroll', markScrolled, { passive: true });

  panels.forEach((panel) => {
    const block = panel.closest('.tier__block');
    const summary = panel.querySelector('summary');
    if (!block || !summary) return;

    block.addEventListener('pointerdown', (event) => {
      start = { x: event.clientX, y: event.clientY, scrolled: false };
    });

    block.addEventListener('click', (event) => {
      if (!isPhone.matches || !start || summary.contains(event.target)) return;
      const moved = start.scrolled
        || Math.abs(event.clientX - start.x) > TAP_TOLERANCE
        || Math.abs(event.clientY - start.y) > TAP_TOLERANCE;
      start = null;
      if (moved || String(window.getSelection()).trim()) return;

      panel.open = !panel.open;
      // Если закрыли касанием глубоко в списке, кнопка могла остаться за верхом экрана — возвращаем к ней
      if (!panel.open && summary.getBoundingClientRect().top < 0) summary.scrollIntoView({ block: 'center' });
    });
  });

  // Карусель: стрелки видны, только если карточки не помещаются; листают на одну карточку
  const nav = document.querySelector('.carousel__nav');
  const prev = document.querySelector('[data-carousel-prev]');
  const next = document.querySelector('[data-carousel-next]');
  if (!nav || !prev || !next) return;

  const step = () => {
    const card = track.querySelector('.tier');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
  };

  const cards = [...track.querySelectorAll('.tier')];
  const carousel = track.closest('.carousel');

  // Карточка, которая сейчас первой на экране
  const currentCard = () => {
    const trackLeft = track.getBoundingClientRect().left + parseFloat(getComputedStyle(track).paddingLeft);
    let current = cards[0];
    let best = Infinity;
    cards.forEach((card) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (distance < best) { best = distance; current = card; }
    });
    return current;
  };

  // Телефон: строки карточек общие, поэтому раскрытое «Остальное» растягивает и соседние карточки.
  // Когда карточку пролистали, сворачиваем её «Остальное» — соседние снова без пустот.
  const closeOffscreen = () => {
    if (!isPhone.matches) return;
    const current = currentCard();
    panels.forEach((panel) => {
      if (panel.open && !current.contains(panel)) panel.open = false;
    });
  };

  // Стрелки — по центру карточки, которая сейчас первой на экране
  const placeNav = () => {
    const current = currentCard();
    if (!current || !carousel) return;
    nav.style.top = `${current.getBoundingClientRect().top - carousel.getBoundingClientRect().top}px`;
    nav.style.height = `${current.offsetHeight}px`;
    nav.style.bottom = 'auto';
  };

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    nav.hidden = max <= 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
    if (!nav.hidden) placeNav();
  };

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  // Последнее событие scroll может прийти до того, как лента «примагнитится» к карточке, —
  // поэтому пересчитываем ещё и после остановки прокрутки
  let settle;
  track.addEventListener('scroll', () => {
    update();
    clearTimeout(settle);
    settle = setTimeout(() => { closeOffscreen(); update(); }, 120);
  }, { passive: true });
  track.addEventListener('scrollend', () => { closeOffscreen(); update(); });
  window.addEventListener('resize', update);
  // Высота карточки меняется при раскрытии «Остальное» и после загрузки шрифтов
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
  panels.forEach((panel) => panel.addEventListener('toggle', update));
  update();
})();

/* ===== Форма заявки ===== */
(() => {
  const form = document.getElementById('lead-form');
  const success = document.getElementById('form-success');
  const failure = document.getElementById('form-error');
  if (!form || !success || !failure) return;

  const submitBtn = document.getElementById('form-submit');
  const submitLabel = submitBtn.textContent;
  const fields = {
    name: form.elements.name,
    contact: form.elements.contact,
    task: form.elements.task
  };

  const validators = {
    name(value) {
      if (!value) return 'Напишите, как к вам обращаться.';
      if (value.length < 2) return 'Имя должно быть не короче 2 символов.';
      return '';
    },
    contact(value) {
      if (!value) return 'Оставьте Telegram, ссылку на ВК или телефон — иначе я не смогу ответить.';
      // E-mail не принимаем: ответ приходит в мессенджер или по телефону
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Укажите Telegram, ссылку на ВКонтакте или номер телефона.';
      const digits = value.replace(/\D/g, '');
      const isPhone = /^[+\d\s()-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
      const isTelegram = /^@[a-zA-Z0-9_]{4,32}$/.test(value) || /t\.me\//i.test(value);
      const isVk = /vk\.(com|ru)\//i.test(value);
      if (!isPhone && !isTelegram && !isVk) {
        return 'Проверьте контакт: подойдёт @username в Telegram, ссылка на страницу ВК или телефон из 10–15 цифр.';
      }
      return '';
    },
    task(value) {
      if (value.length > 1000) return 'Слишком длинное описание — уложитесь в 1000 символов.';
      return '';
    }
  };

  const showError = (name, message) => {
    const input = fields[name];
    const error = document.getElementById(`${input.id}-error`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    error.textContent = message;
  };

  const validate = (name) => {
    const message = validators[name](fields[name].value.trim());
    showError(name, message);
    return !message;
  };

  // Проверяем поле после того, как пользователь из него вышел, а после ошибки — на лету
  Object.keys(fields).forEach((name) => {
    const input = fields[name];
    input.addEventListener('blur', () => { if (input.value.trim()) validate(name); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validate(name);
    });
  });

  const collectLead = () => ({
    name: fields.name.value.trim(),
    contact: fields.contact.value.trim(),
    task: fields.task.value.trim(),
    date: new Date().toISOString(),
    source: LEAD_SOURCE
  });

  const buildMessage = (lead) => {
    const lines = [
      'Здравствуйте, Вадим! Хочу обсудить лендинг.',
      `Имя: ${lead.name}`,
      `Контакт: ${lead.contact}`
    ];
    if (lead.task) lines.push(`Задача: ${lead.task}`);
    return lines.join('\n');
  };

  // Content-Type text/plain — «простой» запрос без preflight: Worker не отвечает на OPTIONS.
  // Тело — JSON, Worker разбирает его независимо от заголовка.
  const sendLead = async (lead) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LEAD_TIMEOUT_MS);
    try {
      const response = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(lead),
        signal: controller.signal
      });
      if (!response.ok) return false;
      const data = await response.json().catch(() => null);
      return Boolean(data && data.ok);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const setSending = (sending) => {
    submitBtn.disabled = sending;
    submitBtn.textContent = sending ? 'Отправляю…' : submitLabel;
  };

  const show = (panel) => {
    [form, success, failure].forEach((node) => { node.hidden = node !== panel; });
    if (panel !== form) panel.focus();
  };

  let lastMessage = '';

  // Согласие на обработку персональных данных: поле появляется при первой попытке отправить форму,
  // без галочки заявка не отправляется. В заявку само согласие не передаётся.
  const consentField = document.getElementById('f-consent-field');
  const consent = document.getElementById('f-consent');
  const consentError = document.getElementById('f-consent-error');

  const validateConsent = () => {
    const ok = consent.checked;
    consent.setAttribute('aria-invalid', ok ? 'false' : 'true');
    consentError.textContent = ok
      ? ''
      : 'Чтобы отправить заявку, отметьте согласие на обработку персональных данных.';
    return ok;
  };

  const hideConsent = () => {
    consentField.hidden = true;
    consent.removeAttribute('aria-invalid');
    consentError.textContent = '';
  };

  consent.addEventListener('change', () => {
    if (consent.getAttribute('aria-invalid') === 'true') validateConsent();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return;
    consentField.hidden = false;
    const results = Object.keys(fields).map(validate);
    results.push(validateConsent());
    if (results.includes(false)) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const lead = collectLead();
    setSending(true);
    const sent = await sendLead(lead);
    setSending(false);

    if (sent) {
      reachGoal('lead_success');
      form.reset();
      hideConsent();
      show(success);
      return;
    }

    // Резервный вариант: готовый текст заявки и Telegram с предзаполненным сообщением
    lastMessage = buildMessage(lead);
    document.getElementById('form-error-message').textContent = lastMessage;
    document.getElementById('form-error-telegram').href =
      `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(lastMessage)}`;
    document.getElementById('form-error-copy').hidden = true;
    show(failure);
  });

  document.getElementById('form-error-telegram').addEventListener('click', async () => {
    document.getElementById('form-error-copy').hidden = !(await copy(lastMessage));
  });

  document.getElementById('form-error-retry').addEventListener('click', () => {
    show(form);
    form.requestSubmit();
  });

  document.querySelectorAll('[data-form-reset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      show(form);
      fields.name.focus();
    });
  });
})();
