# Prestamos App — Sistema de Gestión de Préstamos

Sistema web responsivo de seguimiento financiero para la gestión de préstamos, construido con Python (FastAPI) y una interfaz moderna tipo dashboard.

## 📐 Arquitectura

```
prestamos-app/
├── app/                     # Backend (FastAPI)
│   ├── main.py              # Entry point, CORS, routers
│   ├── config.py            # Configuración (DB, JWT)
│   ├── database.py          # SQLAlchemy engine & session
│   ├── models.py            # ORM: User, Client, Loan, Payment
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT + bcrypt auth
│   ├── routers/             # API endpoints
│   │   ├── auth.py          # Login/registro
│   │   ├── clients.py       # CRUD clientes
│   │   ├── loans.py         # CRUD préstamos + simulador
│   │   ├── payments.py      # Registro de pagos + recibos
│   │   └── dashboard.py     # Resumen mensual & stats
│   └── utils/
│       ├── loan_calculator.py  # Amortización francesa
│       └── receipt.py          # Generador de comprobantes
├── static/                  # Frontend (HTML/CSS/JS)
│   ├── css/styles.css       # Dark theme + glassmorphism
│   └── js/                  # SPA modules
├── templates/index.html     # HTML shell
├── requirements.txt
└── README.md
```

## 🗄️ Esquema de Base de Datos

| Tabla      | Columnas Principales |
|------------|---------------------|
| **users**  | id, username, password_hash, full_name |
| **clients** | id, full_name, id_number (UK), phone, email, address |
| **loans** | id, client_id (FK), principal, interest_rate, interest_type, payment_frequency, total_periods, total_amount, outstanding_balance, status, penalty_rate, start_date, end_date |
| **payments** | id, loan_id (FK), amount, principal_portion, interest_portion, penalty_portion, balance_after, payment_date, receipt_number (UK) |

## 🚀 Inicio Rápido

```bash
cd prestamos-app
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Abrir http://localhost:8000 → Registrarse → Iniciar sesión.

## 📋 Funcionalidades

- **Dashboard:** Stats de portafolio, gráficos mensuales capital vs intereses
- **Clientes:** CRUD completo con búsqueda y historial de préstamos
- **Préstamos:** Creación con amortización francesa, estados (Activo/Saldado/En Mora)
- **Simulador:** Calculadora interactiva con tabla de amortización
- **Pagos:** Registro con desglose automático (capital/interés), comprobante

## 🔐 Fórmula de Amortización (Sistema Francés)

```
Cuota = P × r / (1 - (1 + r)^-n)
```

Donde P = capital, r = tasa por periodo (decimal), n = número de periodos.

## 🛠️ Stack

- **Backend:** FastAPI + SQLAlchemy + Pydantic
- **DB:** SQLite (desarrollo) → PostgreSQL ready
- **Auth:** JWT + bcrypt
- **Frontend:** Vanilla JS SPA + Chart.js + Inter font
