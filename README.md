# ISO Tooling Selector (SKM)

Бренд-нейтральное веб-приложение и API для подбора твердосплавных пластин (СМП) и корпусного инструмента для токарной, фрезерной и осевой обработки. Построено на стандартах **ISO 13399**, **ISO 1832**, **ISO 513** и расчётном ядре **Кинцле**.

## Возможности
- **Визуальный ISO 1832 декодер:** мгновенный разбор кодов (`CNMG`, `CNGA`, `WNMG`, `DNMG`, `VNMG`, `SNMG`, `CCMT`, `DCMT`, `APKT`, `SEKT`, `RDMT`, `WCMX`, `SPMG`) на 7 сегментов, SVG-эскиз и расчёт ключа гнезда (`seat_pocket_signature`) с точным соответствием округлению PostgreSQL.
- **Расширенный бренд-нейтральный каталог (`db/seed.sql`):** 17 пластин, 10 сплавов (CVD, PVD, Uncoated, CBN), 10 стружколомов с 2D-полигонами, 13 корпусов и 12 подгрупп материалов по всем 6 группам ISO 513 (`P, M, K, N, S, H`).
- **Физика резания (Кинцле):** RPM, $v_f$, $h_m$ (с радиальным утонением при фрезеровании), $F_c$, MRR, мощность $P_c$ и момент $M_c$ с проверкой лимитов станка.
- **Cross-Reference Engine:** эндпоинт `GET /api/inserts/{insert_id}/equivalents` и панель функциональных аналогов в GUI.
- **Два режима данных:** реальный **PostgreSQL 16+ (`psycopg3`)** поверх `v_insert_selector_catalog` или встроенный автономный режим (`memory_seed` / офлайн GUI).

## Запуск через Docker Compose (PostgreSQL + FastAPI в 1 команду)

```bash
docker compose up --build
```

Контейнер `db` автоматически накатит `db/schema.sql` и `db/seed.sql`, а приложение откроется на:
- **GUI:** http://localhost:8000/
- **OpenAPI / Swagger:** http://localhost:8000/docs

## Локальный запуск (Python)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Запуск тестов

```bash
pytest -v
```
