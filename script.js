'use strict';

/* Данные портфолио для модального окна. Тексты синхронизированы с content.md */
const PROJECTS = {
  alibi: {
    title: 'Барбершоп «Алиби»',
    tags: ['Демо-проект', 'HTML', 'CSS', 'JavaScript'],
    image: 'assets/alibi-preview.svg', // [ЗАПОЛНИТЬ] заменить на реальный скриншот 1600×1000
    imageAlt: 'Превью лендинга барбершопа «Алиби»: первый экран с заголовком и кнопкой записи',
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
    img: document.getElementById('modal-img'),
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

  const open = (id, trigger) => {
    const project = PROJECTS[id];
    if (!project) return;
    el.img.src = project.image;
    el.img.alt = project.imageAlt;
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
  if (!form || !success) return;

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

  const buildMessage = () => {
    const lines = [
      'Здравствуйте, Вадим! Хочу обсудить лендинг.',
      `Имя: ${fields.name.value.trim()}`,
      `Контакт: ${fields.contact.value.trim()}`
    ];
    const task = fields.task.value.trim();
    if (task) lines.push(`Задача: ${task}`);
    return lines.join('\n');
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const results = Object.keys(fields).map(validate);
    if (results.includes(false)) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Сервера для приёма заявок пока нет: собираем текст и предлагаем отправить его в мессенджер
    const message = buildMessage();
    const copied = await copy(message);
    document.getElementById('form-success-message').textContent = message;
    document.getElementById('form-success-text').textContent = copied
      ? 'Текст заявки скопирован. Откройте мессенджер и вставьте его в сообщение — отвечу и пришлю оценку.'
      : 'Скопируйте текст заявки ниже и отправьте его в мессенджер — отвечу и пришлю оценку.';

    form.hidden = true;
    success.hidden = false;
    success.focus();
  });

  document.getElementById('form-reset').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    fields.name.focus();
  });
})();
