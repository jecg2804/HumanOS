# Spectrum Info-Link + TLS Database Endpoint — Guía Operacional ICONSA (v2)

> Documento operacional para conectar Spectrum (cloud-hosted) a Supabase vía ODBC sobre TLS Database Endpoint.
> Versión 2 — incorpora correcciones, hallazgos validados, y nombres reales de tablas del Spectrum de ICONSA.
> Audiencia: Jaime Cucalón (ejecutor del setup).

---

## 0. Cómo usar este documento

Este es un runbook ejecutable, no una explicación abstracta. Sigue las secciones en orden. Cada paso de Spectrum tiene referencia oficial al lado. Lo que no está confirmado oficialmente, lo marco con `[decisión técnica nuestra]`.

Cuando dice "James hace", significa que la persona ejecutando es James con acceso temporal a un usuario admin de Spectrum (porque Astrid está de vacaciones por dos semanas).

---

## 1. Resumen ejecutivo

**Objetivo.** Establecer un pipeline de ingesta read-only desde el SQL Server de Spectrum (cloud, hosted by Trimble) hacia Supabase. Esto desbloquea acceso a data transaccional histórica (POs, AP invoices, equipment cost transactions, job cost transactions, GL, meter readings) que SDX no expone.

**Estrategia.** Un VPS dedicado de DigitalOcean ($6/mes) funciona como **ETL hub** de ICONSA. Su IP estática es la que Trimble whitelistea para acceder a Spectrum sobre el TLS Database Endpoint. El mismo VPS sirve, a futuro, como punto único de extracción para PayDay, ProjectSight, SkyData GPS, B2W, y Google Drive.

**Precondiciones**:
- [ ] VPS provisionado con IP estática conocida (James, 5 minutos en DigitalOcean)
- [ ] Acceso temporal a un usuario admin de Spectrum (James, mientras Astrid de vacaciones)
- [ ] Acceso al portal de Viewpoint Support para abrir/seguir el caso 01609104 (Astrid o usuario con permisos)
- [ ] Contrato vigente de Trimble Construction One — confirmado

**Modelo de costos (recurrente)**:
- VPS DigitalOcean: $6/mes
- Backups del VPS (recomendado): +$1.20/mes
- Supabase: ya pagado, sin costo adicional
- VPN add-on de Trimble (TLS Database Endpoint): **probablemente incluido en TC1** — confirmar en el ticket. Si no está incluido, Trimble cotiza separado.

---

## 2. Decisiones arquitectónicas y justificaciones

### ¿Por qué Info-Link sobre ODBC en lugar de seguir solo con SDX?

SDX (SOAP/XML web services) solo expone master data. Está documentado oficialmente que SDX no expone transacciones [Source: ya lo validamos empíricamente con los 21 servicios Get; el handoff de mayo 2026 lo confirma]. Info-Link permite acceso ODBC directo al SQL Server, exponiendo **5,856 tablas y vistas** según el Table Directory Listing que recibimos de Trimble Support.

### ¿Por qué un VPS shim y no Supabase Foreign Data Wrapper directo?

Supabase **sí** tiene MSSQL Foreign Data Wrapper nativo. Pero **no funciona en nuestro caso** porque Supabase no tiene IP estática de egress.

> "IPv4 addresses are guaranteed to be static for ingress traffic. **If your database is making outbound connections, the outbound IP address is not static and cannot be guaranteed.**"
> — [Supabase Docs — Dedicated IPv4 Address for Ingress](https://supabase.com/docs/guides/platform/ipv4-address)

> "Supabase doesn't publish outbound IP ranges, and most services (REST, Storage, Realtime, Edge Functions) don't have static egress IPs. So there's no list to whitelist."
> — [Supabase GitHub Discussion #39692](https://github.com/orgs/supabase/discussions/39692)

Y Supabase mismo recomienda el patrón shim/proxy con IP estática para este escenario:

> "Deploy a small, dedicated instance (for example, an AWS EC2 instance or similar cloud VM) with a fixed egress IP. This instance will act as your gateway or proxy."
> — [Supabase Docs — Why Edge Functions cannot provide static egress IPs](https://supabase.com/docs/guides/troubleshooting/why-supabase-edge-functions-cannot-provide-static-egress-ips-for-whitelisting-3d78b0)

### ¿Por qué DigitalOcean en lugar de Hetzner u otro?

`[decisión técnica nuestra, no source oficial]`

Spectrum cloud está en Azure US-East (dominio `dexterchaney.com`). Supabase de ICONSA está en `aws-0-us-east-1`. Un VPS en Miami o NYC tiene 30-50 ms a ambos extremos. Hetzner en Europa sería 130+ ms ida y vuelta, peor para queries de mayor volumen. DigitalOcean es barato, tiene IP estática automática, y el panel es simple para no consumir tiempo de IT.

### ¿Read-only es obligatorio?

Sí. Trimble lo documenta explícitamente:

> "It's recommended that the Systems Administrator be the only one granted access to the Info-Link security setup menu choices [...] It's important to control who receives access, what information they get access to, and what they can do to the database."
> — [Trimble Help — Introduction to Info-Link](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/introduction-to-info-link)

Y específicamente sobre el patrón Cloud:

> "Select the checkbox for READ ONLY ACCESS."
> — [Trimble Help — Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment)

Writes vía Info-Link no están cubiertos por Software Maintenance Agreement.

### ¿Python o .NET para el shim?

`[decisión técnica nuestra — propongo Python]`

Razones:
- pyodbc es maduro, soporte multiplataforma
- Tu colega usa .NET — si quieres compartir mantenimiento, .NET es válido alternativa
- La doc oficial de Trimble dice "any ODBC client" — no impone lenguaje [Source: Info-Link intro]

Default propuesto: Python con `pyodbc` sobre Microsoft ODBC Driver 18. Si tu colega va a mantenerlo, conversación abierta.

---

## 3. Arquitectura completa

```
┌──────────────────────────────────┐
│  Spectrum Cloud (Trimble)        │
│   iconsanet.dexterchaney.com     │
│   SQL Server protegido           │
└────────────┬─────────────────────┘
             │ ODBC sobre TLS
             │ Puerto custom asignado por Trimble
             │ Solo IP whitelistada
             ▼
┌──────────────────────────────────┐
│  TLS Database Endpoint (Trimble) │  ← Provisionado por Trimble Cloud
│  Hostname formato:               │     Engineering a petición vía
│   xxxx-data.dexterchaney.com     │     ticket
└────────────┬─────────────────────┘
             │ Conexión solo desde
             │ IP estática del VPS
             ▼
┌──────────────────────────────────┐
│  VPS DigitalOcean ($6/mes)       │  ← ETL hub central de ICONSA
│   Ubuntu 24.04                   │
│   IP estática conocida           │
│   ODBC Driver 18 + Python 3      │
│   - Lee credenciales del vault   │
│   - Queries SQL programadas      │
│   - Transforma a JSON            │
│   - Postea a Supabase            │
└────────────┬─────────────────────┘
             │ HTTPS + service role key
             ▼
┌──────────────────────────────────┐
│  Supabase                        │
│   raw_spectrum.*                 │
│   stg_spectrum.*                 │
│   core.*                         │
└──────────────────────────────────┘
```

---

## 4. Setup paso a paso

### Parte A — Provisionar el VPS

> Tiempo: 5 minutos. Lo hace James solo.

1. Login en [cloud.digitalocean.com](https://cloud.digitalocean.com).
2. Create → Droplet.
3. Configuración:
   - **Region**: New York 1, 2, o 3 (NYC) — o Miami si está disponible
   - **OS**: Ubuntu 24.04 LTS x64
   - **Plan**: Basic, Regular SSD, $6/mes (1 vCPU, 1 GB RAM, 25 GB SSD)
   - **Backups**: habilitar (+$1.20/mes) — recomendado
   - **Authentication**: SSH key (recomendado) o password
   - **Hostname**: `iconsa-etl-hub`
4. Click "Create Droplet".
5. Anotar la IPv4 pública asignada (aparece en el dashboard). **Esta es la IP que va al ticket de Trimble.**

### Parte B — James configura Info-Link en Spectrum

> Tiempo: 30-45 minutos. Requiere acceso temporal a usuario admin de Spectrum.
> No requiere ticket a Trimble para esta parte.

#### B.1 Verificar que el módulo Info-Link está activo

1. Login a Spectrum con el usuario admin.
2. Navegar a `System Administration → Installation → Company`.
3. En la pestaña "Modules", verificar que la casilla **Info-Link** esté marcada.

> Si Info-Link no está activo, **detener aquí**: requiere licencia y consulta con Trimble.

[Source: [Trimble Help — Introduction to Info-Link](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/introduction-to-info-link) — "The Spectrum Info-Link module allows a non-technical person to set up and maintain security for the Spectrum database from within Spectrum"]

#### B.2 Activar la security category IL para el usuario admin

1. Navegar a `System Administration → Security → Operator Maintenance`.
2. Abrir el operador admin (el que se está usando).
3. En la pestaña de security categories, agregar la categoría `IL` (Info-Link).
4. Guardar.

[Source: [Trimble Help — Introduction to Info-Link](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/introduction-to-info-link) — "Before users can access the Info-Link menu, the Systems Administrator needs to add the Info-Link security category to operator security"]

#### B.3 Crear una Table Category

> Una "Table Category" es un grupo lógico de tablas con un permiso compartido.

1. Desde el Site Map, navegar a `Info-Link → Table Categories Maintenance`.
2. Seleccionar `New`.
3. Llenar:
   - **Category**: `ICONSA_ETL_HUB`
   - **Description**: `Read-only access for ICONSA central ETL pipeline (VPS to Supabase)`
4. Guardar.
5. Hacer click en `Update Database` para persistir. **Si el status no cambia a "All entries have been updated to the database", llamar a Trimble Support.**

[Source: [IL Quick Start Guide PDF](https://help.trimble.com/en/spectrum/spectrum/tools/info-link) (Trimble, 2017 rev 2022) que Trimble envió en el caso 01609104]

#### B.4 Configurar las tablas accesibles (Table Security Maintenance)

> Aquí le decimos a Info-Link qué tablas/vistas son accesibles dentro de la Table Category creada.
> Empezamos con un set mínimo basado en los módulos de Tier 1 (sección 5 de este documento).

1. Desde el Site Map, navegar a `Info-Link → Table Security Maintenance`.
2. Para cada tabla del listado abajo, seleccionar `New` y agregar:
   - **Table Name**: nombre exacto (ver sección 5 de este documento)
   - **Category**: `ICONSA_ETL_HUB`
   - **Access**: `Read-only`
3. Guardar después de cada una.
4. Al final, click `Update Database`. Confirmar status `All entries have been updated to the database`.

[Source: [Trimble Help — Table Security Maintenance](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/info-link-screens-overview/table-security-maintenance) — "Use this screen to build a list of Spectrum data tables (or views) that can be accessed with Info-Link [...] Select Update Database to apply current settings"]

> **Set inicial recomendado: ver Sección 5 de este documento.** Empezamos con tablas de EC, JC, PO y PR. AP la dejamos pendiente porque los nombres exactos requieren validar con Table Directory Inquiry (paso B.5).

#### B.5 Validar nombres exactos de tablas con Table Directory Inquiry

> Antes de configurar B.4 con tablas inventadas, vale la pena verificar nomenclatura en nuestra instancia.

1. Desde Site Map, `Info-Link → Table Directory Inquiry`.
2. Seleccionar un módulo (ej. `AP`).
3. La pantalla muestra tablas y columnas con descripción.
4. **Recomendado**: imprimir o exportar los listados de los módulos que vamos a usar (EC, JC, PO, AP, GL, PR). Sirven como referencia mientras armamos las queries.

[Source: [Trimble Help — Table Directory](https://help.trimble.com/en/spectrum/spectrum/tools/enterprise-management/spectrum-menus/inquiries-overview/table-directory) — "Use the Table Directory Inquiry screen to view and print database table names and column documentation, by module"]

#### B.6 Crear el Info-Link User

> Este es el usuario SQL Server que el VPS usará para conectarse al SQL Server de Spectrum.
> **Estos pasos deben hacerse con el teclado, no solo con clicks.**

1. Desde el Site Map, navegar a `Info-Link → User Security Maintenance`.
2. Click `New`.
3. Seleccionar la compañía `ICN`.
4. En el campo **Database User**, escribir: `XChangeICONSAPipeline`
5. **Importante: presionar Enter en el teclado**, NO solo OK.

   > "It will not work if you only select OK. You must press Enter on your keyboard."
   > — [Trimble Help — Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment)

6. Crear un password fuerte (mínimo 16 caracteres, mezcla de mayúsculas, minúsculas, números, símbolos).
   - **Guardar este password inmediatamente en un password manager (1Password, Bitwarden, etc.) — no se podrá recuperar después.**
7. Click `OK`.
8. En la pantalla de permisos, asociar el user a la categoría `ICONSA_ETL_HUB` con permiso `Read-only`.
9. Click `Update Database` para guardar.

#### B.7 Información a registrar

Después de B.6, anotar y guardar en lugar seguro:

| Campo | Valor |
|---|---|
| Spectrum URL (SDX usa este) | `iconsanet.dexterchaney.com` |
| Database name | Pendiente — lo confirma Trimble en el ticket. Formato típico: `Spectrum_00xxxxx` |
| Info-Link username (sin prefijo) | `XChangeICONSAPipeline` |
| **Info-Link username (con prefijo) — el que se usa para ODBC** | `ICNXChangeICONSAPipeline` |
| Info-Link password | *** guardado en password manager *** |
| Company code | `ICN` |
| TLS Database Endpoint hostname | Pendiente — lo confirma Trimble |
| TLS Database Endpoint port (custom) | Pendiente — lo confirma Trimble |
| IP estática del VPS | (la del paso A.5) |

> El prefijo `ICN` se agrega automáticamente al username para uso ODBC.
>
> "Enter the Info-Link username including the company code (for example, XYZX[Info-Link username])"
> — [Trimble Help — Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment)
>
> "ALL SQL accounts should now be appended with the company code applicable to the company who uses the SQL account."
> — [ERP Cloud FAQ — Creating SQL Accounts](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/creating-sql-accounts)

---

### Parte C — Seguimiento al ticket de Trimble (caso 01609104)

> Quien tiene acceso al portal: Astrid de vacaciones. Si James puede acceder con sus credenciales o las de otro admin, lo hace. Si no, espera a Astrid.
>
> Tiempo: 15 minutos para responder al thread. Respuesta de Trimble esperada: 1-3 días hábiles.

#### C.1 Acceder al caso existente

1. Login a [support.viewpoint.com](https://support.viewpoint.com) con credenciales habilitadas.
2. Buscar el caso `01609104` ("Spectrum database").

#### C.2 Responder al thread

Texto a pegar (en español, igual que el thread original):

```
Hola,

Gracias por los documentos compartidos. Las guías de Info-Link
básico y los recursos de Excel/Crystal Reports nos sirven como
contexto. Quiero aclarar lo que estamos buscando para que avancemos
en lo que nos toca a cada lado.

Nuestro objetivo es construir una integración custom de Spectrum
hacia nuestra plataforma analítica interna (basada en Supabase /
PostgreSQL). Específicamente:

- Conexión ODBC read-only al SQL Server de Spectrum desde un VPS
  con IP estática pública, sobre el TLS Database Endpoint.
- Cliente ODBC: pyodbc en Python sobre Microsoft ODBC Driver 18
  for SQL Server.
- No vamos a usar App Xchange ni un agente de Trimble. La integración
  es custom y la mantenemos in-house.

Este patrón es equivalente al documentado en "Prepare a Spectrum
Cloud Environment", pero reemplazando el App Xchange Agent por
nuestro propio cliente ODBC con nuestra IP estática.

Lo que necesitamos del lado de ustedes:

1. Confirmar que el TLS Database Endpoint está incluido en nuestro
   contrato actual de Trimble Construction One. Si no, cotización
   del add-on.

2. Levantar el TLS Database Endpoint para nuestra instancia y
   compartir:
   - Hostname (formato xxxx-data.dexterchaney.com)
   - Puerto custom asignado para tráfico ODBC
   - Nombre del database al que conectarse
   - IP del endpoint (para resolución por HOSTS si aplica)

3. Whitelistear nuestra IP estática pública para acceso al endpoint:

   [INSERTAR_IP_DEL_VPS]

4. Enviar el formulario "Upgrade Info-Link Access" para llenarlo
   en modalidad READ ONLY ACCESS.

5. Ejecutar los siguientes grants en el SQL Server para el usuario
   Info-Link que vamos a crear (ICNXChangeICONSAPipeline):

   GRANT EXECUTE ON dbo.dci_PAOpenKey
     TO ICNXChangeICONSAPipeline
   GRANT VIEW DEFINITION ON SYMMETRIC KEY::DC_Key
     TO ICNXChangeICONSAPipeline
   GRANT CONTROL ON CERTIFICATE::DC_Cert
     TO ICNXChangeICONSAPipeline

En paralelo, en cuanto confirmen #1 y #2, creamos el usuario
Info-Link de nuestro lado siguiendo el IL Quick Start Guide.

Una pregunta final: ¿hay alguna consideración específica para
integraciones custom (sin App Xchange) que debamos tener en
cuenta? ¿Patrones de query o cadencia recomendados para no
impactar producción?

Quedamos atentos.

Saludos,
Astrid de la Guardia / Jaime Cucalón
Ingeniería Continental, S.A.
```

> Antes de enviar: reemplazar `[INSERTAR_IP_DEL_VPS]` con la IP del paso A.5.

[Source de los 3 grants SQL — texto exacto verbatim de [Trimble Help — Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment)]

#### C.3 Llenar el Upgrade Info-Link Access form

Trimble responderá con un formulario PDF. Llenarlo así:

| Campo | Valor |
|---|---|
| Access type | **READ ONLY ACCESS** (marcar checkbox) |
| Info-Link username | `ICNXChangeICONSAPipeline` |
| IP Address(es) | La IP del VPS (paso A.5) |
| Customer Name | Jaime Cucalón |
| Title | Industrial Engineer / Internal Apps Owner |

Devolver el formulario completado al support assistant.

#### C.4 Información que Trimble debe regresar

En la respuesta final del ticket, esperamos:

- [ ] Hostname del TLS Database Endpoint (formato `xxxx-data.dexterchaney.com`)
- [ ] Puerto custom del endpoint (NO 1433 — Trimble explícitamente dice que es custom)
- [ ] Database name a usar en el connection string
- [ ] IP del endpoint para HOSTS si aplica
- [ ] Confirmación de que la IP del VPS quedó whitelisteada
- [ ] Confirmación de que los 3 grants SQL se ejecutaron
- [ ] Confirmación si el VPN add-on está incluido en contrato o tiene costo adicional
- [ ] Respuesta a preguntas finales sobre custom integration vs AppXchange

[Source: [ERP Cloud FAQ — TLS Database Endpoint](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/tls-database-endpoint) — "Port 1443 is the standard, but MOST EVERY CUSTOMER WILL HAVE A CUSTOM PORT. PLEASE CHECK WITH YOUR CLOUD ENGINEERING CONTACT TO DETERMINE YOUR SPECIFIC PORT"]

---

### Parte D — Configurar el VPS (cuando Trimble confirme)

> Tiempo: 30-60 minutos. Hace James.

#### D.1 SSH al VPS

```bash
ssh root@<IP_DEL_VPS>
```

#### D.2 Instalar Microsoft ODBC Driver 18 for SQL Server

```bash
# Agregar repo de Microsoft
curl -sSL https://packages.microsoft.com/keys/microsoft.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg

curl -sSL https://packages.microsoft.com/config/ubuntu/24.04/prod.list | \
  sudo tee /etc/apt/sources.list.d/mssql-release.list

# Instalar driver + utilidades
sudo apt update
sudo ACCEPT_EULA=Y apt install -y \
  msodbcsql18 \
  mssql-tools18 \
  unixodbc-dev

# Agregar sqlcmd al PATH (para testing)
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> ~/.bashrc
source ~/.bashrc
```

[Source: [Microsoft Docs — Install ODBC Driver on Linux](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server) (Ubuntu 24.04)]

#### D.3 Test de conectividad con sqlcmd

```bash
sqlcmd \
  -S "tcp:<HOSTNAME_DEL_TLS_ENDPOINT>,<PORT_CUSTOM>" \
  -U "ICNXChangeICONSAPipeline" \
  -P "<PASSWORD_DEL_VAULT>" \
  -d "<DATABASE_NAME>" \
  -N -C \
  -Q "SELECT TOP 5 EQUIP_MASTER_NUMBER FROM EC_EQUIPMENT_MASTER"
```

> Si retorna 5 filas: **conexión confirmada**. Saltar a D.4.
> Si retorna error: ver sección 9 (troubleshooting).

#### D.4 Instalar Python + pyodbc

```bash
sudo apt install -y python3 python3-pip python3-venv

# Crear virtualenv para el proyecto
mkdir -p ~/spectrum-etl
cd ~/spectrum-etl
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install pyodbc python-dotenv requests
```

#### D.5 Crear archivo de credenciales

```bash
cat > ~/spectrum-etl/.env <<EOF
SPECTRUM_HOST=<HOSTNAME_DEL_TLS_ENDPOINT>
SPECTRUM_PORT=<PORT_CUSTOM>
SPECTRUM_DB=<DATABASE_NAME>
SPECTRUM_USER=ICNXChangeICONSAPipeline
SPECTRUM_PASSWORD=<PASSWORD_DEL_VAULT>

SUPABASE_URL=https://bzeoszympkkicwlfdtcn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
EOF

chmod 600 ~/spectrum-etl/.env
```

#### D.6 Smoke test Python end-to-end

`~/spectrum-etl/smoke_test.py`:

```python
import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

conn_str = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={os.environ['SPECTRUM_HOST']},{os.environ['SPECTRUM_PORT']};"
    f"DATABASE={os.environ['SPECTRUM_DB']};"
    f"UID={os.environ['SPECTRUM_USER']};"
    f"PWD={os.environ['SPECTRUM_PASSWORD']};"
    f"Encrypt=yes;TrustServerCertificate=no;"
)

with pyodbc.connect(conn_str) as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 10 EQUIP_MASTER_NUMBER, EQUIP_DESC "
                   "FROM EC_EQUIPMENT_MASTER")
    rows = cursor.fetchall()
    print(f"Fetched {len(rows)} rows:")
    for r in rows:
        print(f"  {r[0]} | {r[1]}")
```

Ejecutar:
```bash
cd ~/spectrum-etl
source .venv/bin/activate
python smoke_test.py
```

Si imprime 10 equipos: **pipeline mínimo funcional**. A partir de aquí se construye lo demás.

---

### Parte E — Primera ingesta funcional a Supabase

> Tiempo: trabajo de varios días, ejecutado con Claude Code después de validar Parte D.

Esta parte queda fuera del scope del runbook básico. El patrón a seguir es:

1. Crear schemas `raw_spectrum`, `stg_spectrum`, y `core` en Supabase vía `[bd-pending]` en CHANGELOG.
2. Por cada tabla a ingestar:
   - Crear `raw_spectrum.<tabla>_raw` con columnas `run_id, captured_at, body_json, record_count, success`.
   - Crear `stg_spectrum.<tabla>` con columnas tipadas y PK natural.
3. Edge Function NO aplica aquí — el shim corre en el VPS, no en Supabase. El shim postea a Supabase via PostgREST.
4. Schedule en cron del VPS: `0 2 * * * /home/user/spectrum-etl/.venv/bin/python /home/user/spectrum-etl/run.py >> /var/log/spectrum-etl.log 2>&1`
5. Auditoría en `meta.ingestion_runs` (Supabase) con cada corrida.

---

## 5. Catálogo de tablas Spectrum

### Convención de nombres real (validada con el Table Directory Listing PDF de ICONSA, mayo 2026)

```
MODULO_DESCRIPTOR        → VIEW (filtrada automáticamente por compañía actual)
MODULO_DESCRIPTOR_MC     → TABLE física (Multi-Company; trae todas, requiere WHERE company_code)
MODULO_DESCRIPTOR_V      → VIEW especializada
MODULO_DESCRIPTOR_V_MC   → VIEW multi-company
MODULO_DESCRIPTOR_CRYPTO → versión con columnas encriptadas desencriptadas (requiere los grants de dci_PAOpenKey)
```

**Decisión para nuestro caso** `[decisión técnica nuestra]`: usaremos las **VIEWs sin sufijo `_MC`** cuando estén disponibles. Estas filtran automáticamente por la compañía del usuario (ICN) y eliminan la posibilidad de leer data de otras compañías por accidente. Si necesitamos multi-company en el futuro, las `_MC` están disponibles.

### Distribución del schema (ICONSA, validada de las 286 páginas del Table Directory Listing)

5,856 objetos en 31 módulos: 2,582 tablas + 3,274 vistas. Top módulos:

| Módulo | Objetos | Significado |
|---|---|---|
| PR | 836 | Payroll |
| AR | 504 | Accounts Receivable |
| AP | 495 | Accounts Payable |
| JC | 494 | Job Cost |
| PA | 451 | Platform / Audit / Core |
| HR | 402 | Human Resources |
| WO | 401 | Work Orders |
| EC | 278 | Equipment Cost |
| PJ | 212 | Project Management |
| MM | 192 | Materials Management |
| PO | 178 | Purchase Orders |
| IC | 168 | Inventory Control |
| SC | 159 | Subcontracts |
| GL | 141 | General Ledger |
| TM | 138 | Time Management |

### Tablas confirmadas en el Table Directory Listing de ICONSA — set inicial de Table Security Maintenance

Estas son las que se agregan en el paso B.4. Set mínimo prioritario:

#### Módulo EC (Equipment Cost)

| Nombre | Tipo | Para qué |
|---|---|---|
| `EC_EQUIPMENT_MASTER` | VIEW | Master de equipos (validar con SDX `GetEquipment`) |
| `EC_ACTUAL_COST` | VIEW | Transacciones de costo actuales por equipo |
| `EC_ACTUAL_COST_HISTORY` | VIEW | Histórico de costos por equipo |
| `EC_METER_READING` | VIEW | Lecturas de horímetro/odómetro actuales |
| `EC_METER_HISTORY` | VIEW | Histórico de lecturas |
| `EC_COST_CATEGORY` | VIEW | Taxonomía de categorías de costo |
| `EC_COMPONENT_LOG` | VIEW | Historial de componentes (para mantenimiento) |

#### Módulo JC (Job Cost)

| Nombre | Tipo | Para qué |
|---|---|---|
| `JC_JOB_MASTER` | VIEW | Master de jobs |
| `JC_COST_TRANSACTION` | VIEW | Transacciones de costo por job/phase |
| `JC_PHASE_COST_BALANCE` | VIEW | Balance real consolidado |
| `JC_PHASE_ESTIMATE_TOTAL` | VIEW | Totales presupuestados |
| `JC_MASTER_PHASES_V_MC` | VIEW | Master de phases (esta sí es _V_MC porque hay variantes) |

#### Módulo PO (Purchase Orders)

| Nombre | Tipo | Para qué |
|---|---|---|
| `PO_PURCHASE_ORDER_HEADER` | VIEW | Cabezales de POs |
| `PO_PURCHASE_ORDER_DETAIL` | VIEW | Líneas de POs |
| `PO_RECEIVING_HISTORY` | VIEW | Recepciones |

#### Módulo AP (Accounts Payable)

> Pendiente de validar nombres exactos con Table Directory Inquiry (paso B.5). El listado de muestra solo enseñó tablas con prefijo `VN_` (Vendor) y `AP_`. Las que buscamos son las de invoices regulares (no approval workflow, no recurring, no temp).

Candidatos preliminares:
- `VN_VENDOR_MASTER` — master de proveedores
- (header de invoice regular: confirmar nombre en B.5)
- (detail de invoice regular: confirmar nombre en B.5)
- `VN_INVOICE_TRAN_DETAIL` — detalle de transacciones de invoice

#### Módulo PR (Payroll)

| Nombre | Tipo | Para qué |
|---|---|---|
| `PR_EMPLOYEE_MASTER` | VIEW | Master de empleados (validar con SDX `GetEmployee`) |

> Coordinar con colega .NET antes de ingestar mucho de PR/payroll — él tiene ownership de schemas `hr` y `payroll` en Supabase.

#### Módulo GL (General Ledger)

| Nombre | Tipo | Para qué |
|---|---|---|
| `GL_JOURNAL_ENTRY_HEADER` | VIEW | Headers de journal entries |
| `GL_JOURNAL_ENTRY_DETAIL` | VIEW | Detail de journal entries |

[Source de todos los nombres: Table Directory Listing PDF (Crystal Reports export) generado por Astrid el 05/13/26, 286 páginas, recibido vía caso 01609104]

### Importante: existencia ≠ uso

Que la tabla esté en el schema no significa que ICONSA la tenga poblada. Spectrum trae el schema completo siempre; cada cliente puebla los módulos que usa.

Lo que **sí sabemos** sobre uso real, vía SDX:

| Módulo | Evidencia de uso | Conclusión |
|---|---|---|
| EC | 420 equipos | Poblado |
| JC | 47 jobs + 501 phases | Poblado |
| PR | 166 empleados | Poblado |
| AR | 87 customers en SDX | Probablemente usado (al menos masters) |
| IC | 3 "test items" | **No usado** — saltar |

Para AP, PO, GL, SC, HR, WO: **sin evidencia hasta validar con queries de conteo después del setup**.

---

## 6. Casos de uso priorizados

Los detallé en conversación anterior, pero los repito aquí ordenados con tabla source.

### 6.1 Equipment Utilization & Cost Reconciliation (alto valor)

**Tablas**: `EC_ACTUAL_COST` + `EC_METER_HISTORY` + SkyData GPS API
**Output**: por equipo, cost/hora real, gap entre horas Spectrum vs horas GPS, equipos sub-utilizados, equipos con ROI negativo.

### 6.2 Real vs Budget Phase-Level Drilldown (alto valor)

**Tablas**: `JC_PHASE_COST_BALANCE` + `JC_PHASE_ESTIMATE_TOTAL` + `JC_COST_TRANSACTION`
**Output**: alertas automáticas cuando una phase pasa X% del budget; notificación a PM responsable.

### 6.3 Three-Way Match Automation (alto valor — pedido directo de Rodrigo)

**Tablas**: `PO_PURCHASE_ORDER_HEADER` + `PO_RECEIVING_HISTORY` + tabla AP invoice (por confirmar)
**Output**: match PO → Receipt → Invoice. Reporte de discrepancias.

### 6.4 Vendor Spend ABC Analysis

**Tablas**: `VN_VENDOR_MASTER` + AP transactions
**Output**: top 20 vendors por spend, concentración de riesgo, tendencias temporales.

### 6.5 MovimientOS ↔ Spectrum bridge

**Tablas**: `EC_EQUIPMENT_MASTER` ↔ `public.equipment` (MovimientOS) por código.
**Output**: validación nightly de masters; reporta equipos huérfanos.

### 6.6 Predictive Maintenance Triggers

**Tablas**: `EC_METER_HISTORY` + `EC_COMPONENT_LOG`
**Output**: equipos próximos a service basado en horas/km acumulados; integrable a MovimientOS para evitar asignar equipos críticos.

> Casos de uso adicionales (cash flow, GL P&L automatizado, subcontractor scorecard) están en chats anteriores. Aquí solo los del Tier 1.

---

## 7. Primeras queries de validación

> Después del smoke test (D.6), las siguientes queries validan que cada módulo está accesible y poblado.

### Q1 — Validación de conexión

```sql
SELECT @@VERSION AS server_version, GETDATE() AS server_time;
```

### Q2 — Cross-check de Equipment con SDX

```sql
SELECT TOP 10
    EQUIP_MASTER_NUMBER,
    EQUIP_DESC,
    EQUIP_STATUS
FROM EC_EQUIPMENT_MASTER
ORDER BY EQUIP_MASTER_NUMBER;
```

Esperado: 10 equipos. Cross-check con SDX `GetEquipment` para validar paridad.

### Q3 — Conteo de transacciones de costo por equipo (último mes)

```sql
SELECT TOP 20
    EQUIP_MASTER_NUMBER,
    COUNT(*) AS transaction_count,
    SUM(COST_AMOUNT) AS total_cost
FROM EC_ACTUAL_COST
WHERE TRANSACTION_DATE >= DATEADD(MONTH, -1, GETDATE())
GROUP BY EQUIP_MASTER_NUMBER
ORDER BY total_cost DESC;
```

> Nombres de columna a confirmar con Table Directory Inquiry o `INFORMATION_SCHEMA.COLUMNS`.

### Q4 — POs abiertos sin recepción

```sql
SELECT
    h.PO_NUMBER,
    h.VENDOR_CODE,
    h.PO_DATE,
    h.TOTAL_AMOUNT,
    h.STATUS
FROM PO_PURCHASE_ORDER_HEADER h
LEFT JOIN PO_RECEIVING_HISTORY r
    ON r.PO_NUMBER = h.PO_NUMBER
WHERE h.STATUS IN ('Open', 'Partial')
  AND r.PO_NUMBER IS NULL
  AND h.PO_DATE < DATEADD(DAY, -30, GETDATE())
ORDER BY h.PO_DATE ASC;
```

### Q5 — Listar columnas de una tabla (utilidad de exploración)

```sql
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'EC_EQUIPMENT_MASTER'
ORDER BY ORDINAL_POSITION;
```

> Si esta query da error de permisos, hay que pedir a Trimble que el Info-Link user tenga acceso a `INFORMATION_SCHEMA`. Asumimos que sí lo tiene; si no, lo solicitamos.

### Q6 — Conteo por módulo (validar uso real)

```sql
-- Para cada módulo del Tier 2 (AR, SC, HR, WO), verificar volumen
-- Reemplazar nombre de tabla por el confirmado en B.5

-- Ejemplo para AR:
SELECT COUNT(*) AS active_customers
FROM AR_CUSTOMER_MASTER
WHERE STATUS = 'A';

-- Ejemplo para SC:
SELECT COUNT(*) AS active_subcontracts
FROM SC_SUBCONTRACT_HEADER
WHERE STATUS = 'Active';
```

Esto da evidencia sólida de qué módulos están en uso real, sin tener que preguntar a Astrid.

---

## 8. Seguridad y operaciones

### 8.1 Read-only siempre

El Info-Link user creado tiene **solo Read-only access**. No se acepta solicitud de write, ni siquiera para "fix de emergencia". Cualquier escenario que requiera escribir a Spectrum va vía SDX (que es transaccional y validado), nunca vía ODBC directo.

[Source: [Trimble Help — Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment) — "Select the checkbox for READ ONLY ACCESS"]

### 8.2 Manejo de credenciales

- Password del Info-Link user **nunca en repo**, nunca en código.
- Storage en el VPS: `.env` con permisos `0600`.
- Rotación: cambiar cada 6-12 meses. Proceso: James (con acceso admin temporal) o Astrid resetea desde Spectrum, James actualiza el `.env` del VPS.
- Backup del `.env`: 1Password vault o equivalente.

### 8.3 Whitelist de IP

- Solo la IP del VPS está autorizada en el TLS endpoint.
- Si el VPS migra a otro proveedor o cambia de IP: abrir nuevo ticket a Trimble para actualizar.
- **Una IP puede estar asignada a UNA SOLA instancia de Trimble** (no se puede usar para producción y test al mismo tiempo). ICONSA solo tiene producción, así que no es problema.

[Source: [ERP Cloud FAQ — TLS Database Endpoint](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/tls-database-endpoint) — "A single TLS Database Endpoint (TLS VPN) can have many IPs assigned to it, but a single IP may ONLY be assigned to ONE TLS Database Endpoint (TLS VPN)"]

### 8.4 Proxy / zScaler — heads-up importante

> **Riesgo conocido**: si el VPS estuviera en una red corporativa con zScaler / proxy / SSL inspection, el TLS Database Endpoint NO funciona.

Como nuestro VPS es DigitalOcean directo (sin proxy intermedio), esto no aplica. Pero para futuro: si en algún momento se migra a una red corporativa con SSE/SASE, hay que excluir tráfico al endpoint de Trimble del filtrado.

[Source: [ERP Cloud FAQ — TLS Database Endpoint](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/tls-database-endpoint) — "We have found with multiple customers that proxy servers and zScaler type solutions cause significant problems with connectivity when using this method"]

### 8.5 Monitoreo del shim

- Log local en el VPS: `/var/log/spectrum-etl.log` con rotation (logrotate).
- Auditoría central en `meta.ingestion_runs` (Supabase) con cada corrida.
- Alerta básica: si falla 2 corridas consecutivas, email vía Resend. Trigger desde el shim, no desde Supabase.
- Trimble registra accesos del lado servidor; si se necesita audit, abrir ticket pidiendo logs.

### 8.6 Backup del VPS

- DigitalOcean snapshots semanales habilitados ($1.20/mes).
- Código del shim versionado en GitHub (repo privado).
- Credenciales en password manager.
- Runbook de recovery: si el VPS se cae, provisionar nuevo droplet, restaurar snapshot, abrir ticket a Trimble para actualizar IP (porque la nueva IP es diferente).

### 8.7 Best practice: un Info-Link user por integración

[Source: [Trimble Help — Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment) — "If you already have an integration using a Spectrum Info-Link User, do not reuse it. It is best practice to create discrete Info-Link Users for each integration"]

Nuestro `XChangeICONSAPipeline` está dedicado a este VPS. Si en el futuro se agrega otra integración (ej. Power BI directo de algún área), se crea otro user, no se reutiliza este.

---

## 9. Troubleshooting

### Error: "Login failed for user 'ICNXChangeICONSAPipeline'"

Causas posibles:
- Password incorrecto — verificar en el password manager.
- El prefijo de company code falta. Probar con username sin prefijo (`XChangeICONSAPipeline`) por si Trimble no aplica auto-prefix.
- Los grants SQL no se ejecutaron. Verificar con Trimble en el ticket.

### Error: "Cannot connect to server" o timeout

Causas posibles:
- IP del VPS no está en la whitelist. Verificar con Trimble.
- Puerto incorrecto — verificar el custom port que dio Trimble.
- Proxy en la ruta — descartado porque el VPS es directo.
- TLS endpoint caído del lado de Trimble — escalar.

### Error: "SSL Provider: The certificate chain was issued by an authority that is not trusted"

- Causa: ODBC Driver 18 valida certificate por default.
- Workaround temporal: agregar `TrustServerCertificate=yes` al connection string (solo para troubleshooting, no producción).
- Solución correcta: instalar CA cert de Trimble en el VPS. Pedir a Trimble el CA cert si aplica.

### Error: "Cannot find table EC_EQUIPMENT_MASTER"

- Verificar que la tabla esté listada en `Info-Link → Table Security Maintenance` con la categoría correcta.
- Validar nombre exacto contra el Table Directory Listing (puede tener variante).
- Confirmar que el user está asociado a la categoría con permiso read.

### Error: "Information schema not accessible"

- Pedir a Trimble que otorgue acceso a `INFORMATION_SCHEMA` al user, o trabajar con el Table Directory Listing como referencia estática.

### Error: queries lentos contra tablas grandes

- Default sin índices: agregar filtros por compañía explícitos.
- Las `_CRYPTO` versions son más lentas. Usar las regulares cuando no se necesite data encriptada.
- Limitar `TOP N` durante exploración.

---

## 10. Apéndices

### A. Sources oficiales consultados

**Documentación oficial de Trimble — Info-Link**:
- [Introduction to Info-Link](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/introduction-to-info-link)
- [Info-Link Screens Overview](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/info-link-screens-overview)
- [Table Security Maintenance](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/info-link-screens-overview/table-security-maintenance)
- [Table Categories Maintenance](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/info-link-screens-overview/table-categories-maintenance)
- [User Security Maintenance](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/info-link-screens-overview/user-security-maintenance)
- [Testing Info-Link Setup](https://help.trimble.com/en/spectrum/spectrum/tools/info-link/procedures-overview/testing-info-link-setup)
- [Table Directory](https://help.trimble.com/en/spectrum/spectrum/tools/enterprise-management/spectrum-menus/inquiries-overview/table-directory)

**Documentación oficial de Trimble — Cloud setup**:
- [Prepare a Spectrum Cloud Environment](https://help.trimble.com/doc/app-xchange/app-xchange/connectivity/app-connectors/trimble-spectrum-connector/connect-spectrum-with-app-xchange/prepare-a-spectrum-cloud-environment) — **el documento más importante**

**Trimble ERP Cloud FAQ (aplica a Vista y Spectrum)**:
- [TLS Database Endpoint](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/tls-database-endpoint)
- [Direct database connections](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/direct-database-connections)
- [Creating SQL accounts](https://sites.google.com/trimble.com/vista-cloud-faq/home/integration-technology/creating-sql-accounts)
- [Setting up IPSEC VPN (alternativa)](https://sites.google.com/trimble.com/vista-cloud-faq/home/moving-to-the-cloud/set-up-IPSEC-VPN)

**Supabase**:
- [Why Edge Functions cannot provide static egress IPs](https://supabase.com/docs/guides/troubleshooting/why-supabase-edge-functions-cannot-provide-static-egress-ips-for-whitelisting-3d78b0)
- [Dedicated IPv4 Address for Ingress](https://supabase.com/docs/guides/platform/ipv4-address)
- [GitHub Discussion #39692 — Egress IP whitelisting](https://github.com/orgs/supabase/discussions/39692)
- [GitHub Discussion #28948 — FDW wrappers outbound connection whitelisting](https://github.com/orgs/supabase/discussions/28948)
- [Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions)

**Microsoft**:
- [Install ODBC Driver on Linux/macOS](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server)
- [pyodbc documentation](https://github.com/mkleehammer/pyodbc/wiki)
- [sqlcmd utility](https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility)

**DigitalOcean**:
- [Create a Droplet](https://docs.digitalocean.com/products/droplets/how-to/create/)
- [Add Backups](https://docs.digitalocean.com/products/droplets/how-to/enable-backups/)

**PDFs recibidos vía caso 01609104**:
- IL Quick Start Guide.pdf (Trimble, 2017 rev 2022) — 5 páginas
- Creating Dynamic Spreadsheet Reports.pdf (Trimble Users Conference, 2017) — 5 páginas
- Microsoft Excel for Project Managers.pdf (Trimble Users Conference, 2011) — 5 páginas
- Info_link_Table_Directory_Listing.pdf — generado por Astrid 05/13/26, 286 páginas, listado completo de 5,856 objetos del SQL Server de Spectrum de ICONSA

### B. Glosario

| Término | Definición |
|---|---|
| **Info-Link** | Módulo nativo de Spectrum para crear usuarios SQL Server con permisos granulares sobre el database. Gratis, viene con Spectrum. |
| **SDX (Spectrum Data Exchange)** | API SOAP/XML para integración con Spectrum. Lo que ICONSA ya tiene configurado (21+ web services). Solo master data. |
| **TLS Database Endpoint (TLS VPN)** | Mecanismo de Trimble para exponer el SQL Server detrás de un endpoint TLS con whitelist de IPs. Disponible para TC1/VP1/Vista SaaS/VEC RDP. No disponible para VFC. |
| **TC1 / Trimble Construction One** | Stack cloud moderno de Trimble. ICONSA está aquí. |
| **AppXchange** | Plataforma de integraciones de Trimble (REST encima de SDX/Info-Link). NO la estamos usando. |
| **Shim** | Programa intermediario entre dos sistemas que no se hablan directo. En nuestro caso, el código Python en el VPS. |
| **Upgrade Info-Link Access form** | Formulario oficial de Trimble para autorizar elevación de permisos de un Info-Link user. Lo envían en respuesta al ticket. |
| **MC (sufijo de tabla)** | Multi-Company. Las tablas físicas con sufijo `_MC` tienen data de todas las compañías; las VIEWs sin `_MC` filtran por la compañía actual del user. |
| **`dbo.dci_PAOpenKey`** | Stored procedure de Spectrum que abre la cipher key para desencriptar columnas sensibles. Requiere grant explícito al user Info-Link. |

### C. Decisiones pendientes (abiertas hasta cerrar el setup)

- [ ] Confirmar si VPN add-on incluido en contrato actual de TC1 (respuesta vendrá en el ticket).
- [ ] Confirmar hostname del TLS endpoint para ICONSA (Trimble lo provee).
- [ ] Confirmar puerto custom asignado por Trimble.
- [ ] Confirmar database name a usar.
- [ ] Confirmar nombres exactos de tablas AP (header de invoice regular) usando Table Directory Inquiry en B.5.
- [ ] Confirmar columnas reales de cada tabla del set inicial (con `INFORMATION_SCHEMA.COLUMNS` después del setup, o con Table Directory Listing).
- [ ] Decidir lenguaje del shim: Python (default) vs .NET (si tu colega va a mantenerlo).
- [ ] Coordinación con tu colega sobre PR / `hr` / `payroll` schema antes de ingestar mucho de payroll.
- [ ] Validar uso real de módulos AP, AR, SC, WO, HR con queries de conteo (Q6).
- [ ] Decidir cadencia de ingesta por tabla (nightly default; algunas podrían ser más frecuentes después).

### D. Información complementaria — qué NO está en este runbook

Cosas que decidimos no incluir aquí pero que existen como referencia separada:

- Casos de uso completos y features ideables — están en la conversación de chat.
- Diseño de schemas `raw_spectrum` / `stg_spectrum` / `core` en Supabase — se hace después del setup, vía `[bd-pending]` en CHANGELOG.
- Script Python completo del shim de producción — se construye con Claude Code después de validar el smoke test.
- Otras fuentes de data (PayDay, ProjectSight, SkyData, B2W, Google Drive) — el mismo VPS las correrá pero cada una tendrá su propio runbook.

---

*Fin del documento. Versión 2, mayo 2026.*
