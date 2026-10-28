'use strict';

/* Приём заявок: Cloudflare Worker пересылает их в Telegram. Токен бота хранится только в Worker. */
const LEAD_ENDPOINT = 'https://long-union-6a9e.shyrhoveckyvadim.workers.dev/';
const LEAD_SOURCE = 'landing-vadim';
const LEAD_TIMEOUT_MS = 10000;
const TELEGRAM_USERNAME = 'illemmy';

/* Данные портфолио для модального окна. Тексты синхронизированы с content.md */
const PROJECTS = {
  alibi: {
    title: 'Барбершоп «Алиби»',
    tags: ['Демо-проект', 'HTML', 'CSS', 'JavaScript'],
    desktop: {
      webp: 'assets/alibi-desktop.webp',
      jpg: 'assets/alibi-desktop.jpg',
      alt: 'Первый экран лендинга барбершопа «Алиби» на компьютере: заголовок «Барбершоп, где тебе рады» и кнопка записи на стрижку'
    },
    mobile: {
      webp: 'assets/alibi-mobile.webp',
      jpg: 'assets/alibi-mobile.jpg',
      alt: 'Мобильная версия лендинга «Алиби»: логотип, меню, адрес, заголовок «Барбершоп, где тебе рады» и кнопка записи на стрижку'
    },
    task: 'Показать барбершоп так, чтобы посетитель за минуту понял, какие есть услуги, как выглядит заведение и где оно находится, — и сразу записался.',
    done: [
      'Структура услуг',
      'Блок атмосферы заведения',
      'Карта с адресом',
      'Блок отзывов',
      'Форма записи',
      'Адаптивная вёрстка'
    ],
    tech: 'HTML, CSS, JavaScript',
    url: 'https://shurhoveckyvadim-creator.github.io/Alibi/'
  }
};

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
  if (!modal || typeof modal.showModal !== 'function') return;

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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return;
    const results = Object.keys(fields).map(validate);
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
      form.reset();
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
