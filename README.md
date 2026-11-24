# ISO Tooling Selector

Бренд-нейтральное веб-приложение и API для подбора твердосплавных пластин (СМП) и корпусного инструмента для токарной, фрезерной и осевой обработки. Построено на стандартах **ISO 13399**, **ISO 1832**, **ISO 513** и расчётном ядре **Кинцле**.

## Возможности MVP
- **Визуальный ISO 1832 декодер:** мгновенный разбор кода (`CNMG 120408`, `CCMT 09T304`, `APKT 160408`, `WCMX 050308` и др.) на 7 сегментов, SVG-эскиз формы и расчёт канонического ключа посадочного гнезда (`seat_pocket_signature`).
- **Интерактивная карта стружколома:** 2D-полигон рабочей зоны $(a_p / f)$ с кликабельной точкой режимов и проверкой дробления стружки.
- **Физика резания (Кинцле):** расчёт RPM, минутной подачи $v_f$, толщины стружки $h_m$ (включая радиальное утонение при фрезеровании), силы $F_c$, MRR, мощности $P_c$ и момента $M_c$ с контролем лимитов выбранного станка.
- **Офлайн-режим GUI:** `static/index.html` работает как с FastAPI-сервером, так и автономно в браузере без запуска бэкенда.

## Структура репозитория

```text
iso-tooling-selector/
├── app/
│   ├── iso1832.py        # Парсер ISO 1832 и генератор ключа гнезда
│   ├── kienzle.py        # Физическое ядро Кинцле и проверка полигона стружколома
│   ├── repository.py     # Слой данных (PostgreSQL / встроенный seed)
│   └── main.py           # FastAPI REST API + раздача GUI
├── db/
│   ├── schema.sql        # Схема PostgreSQL 16+ (ISO 13399 / 1832 / 513)
│   └── seed.sql          # Бренд-нейтральный стартовый набор данных
├── docs/
│   ├── ARCHITECTURE.md   # Целевая архитектура и математика
│   ├── INSTRUCTIONS.md   # Инженерные стандарты разработки
│   └── ROADMAP.md        # Дорожная карта развития
├── static/
│   └── index.html        # Интерактивный прототип GUI
├── tests/
│   └── test_engine.py    # Модульные тесты парсера и физики
├── .github/workflows/
│   └── ci.yml            # GitHub Actions CI (pytest)
├── requirements.txt
├── .env.example
└── LICENSE
```

## Быстрый старт

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- **GUI:** http://localhost:8000/
- **OpenAPI / Swagger:** http://localhost:8000/docs

## Подключение PostgreSQL

```bash
createdb tooling_db
psql -U postgres -d tooling_db -f db/schema.sql
psql -U postgres -d tooling_db -f db/seed.sql
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tooling_db"
uvicorn app.main:app --reload --port 8000
```

## Запуск тестов

```bash
pytest -v
```
