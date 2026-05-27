# SOPs RRHH ICONSA

Documentos oficiales de RRHH ICONSA en formato PDF (manuales, procedimientos, instrucciones técnicas, documentos políticas, formularios). Refleja la carpeta GDrive `RECURSOS HUMANOS > DOCUMENTOS APROBADOS` mantenida por Samantha Kosmas.

**Para Claude Code**: Lee estos PDFs con Filesystem MCP. Google Drive MCP no está habilitado. Para entender qué tipo de solicitud corresponde a cada formulario y cómo implementarlo, consulta `docs/04-DOMAIN-RRHH.md` (catálogo dominio) y el skill `.claude/skills/iconsa-form-implementation/SKILL.md` (procedimiento de implementación).

**Para mantenimiento (James)**: cuando Samantha actualiza un SOP en GDrive, descarga la versión nueva, reemplaza el archivo en este folder respetando el nombre, commit con mensaje `chore(sops): update IC-RH-X-XX vYY`.

## Estructura

```
docs/sops/
├── manuales/
│   └── IC-RH-M-01-Etica-y-Conducta.pdf
│
├── procedimientos/
│   ├── IC-RH-PO-01-Seleccion-Contratacion.pdf
│   ├── IC-RH-PO-05-Acciones-Personal.pdf
│   └── IC-RH-PO-06-Administracion-Planilla.pdf
│
├── instrucciones-tecnicas/
│   ├── IC-RH-IT-01-Expediente-Personal.pdf
│   ├── IC-RH-IT-02-Descuento-Directo.pdf
│   ├── IC-RH-IT-03-Estimacion-ISR.pdf
│   └── IC-RH-IT-04-Guia-Eval-Campo.pdf
│
├── documentos/
│   ├── IC-RH-D-01-Induccion-Campo.pdf
│   ├── IC-RH-D-02-Condiciones-Prestamo.pdf
│   ├── IC-RH-D-04-ISR-Folleto.pdf
│   ├── IC-RH-D-05-Glosario-Prestaciones.pdf
│   ├── IC-RH-D-06-Comedor.pdf
│   ├── IC-RH-D-07-Trabajo-Infantil.pdf
│   └── Suntracs-Descripcion-Labores.pdf
│
└── formularios/
    ├── IC-RH-F-04-01-Emergencia.pdf
    │
    ├── seleccion-contratacion/
    │   ├── IC-RH-F-01-08-Solicitud-Empleo.pdf
    │   └── IC-RH-F-01-09-Hoja-Entrada-Personal.pdf
    │
    ├── capacitacion/
    │   ├── IC-RH-F-02-04-Lista-Asistencia.pdf
    │   ├── IC-RH-F-02-05-Evaluacion-Post.pdf
    │   ├── IC-RH-F-02-07-Firma-Induccion-Campo.pdf
    │   └── IC-RH-F-02-09-Solicitud-Entrenamiento.pdf
    │
    ├── evaluacion-desempeno/
    │   ├── IC-RH-F-03-03-Evaluacion-Semestral.pdf
    │   └── IC-RH-F-03-04-Evaluacion-Campo.pdf
    │
    ├── acciones-personal/
    │   ├── IC-RH-F-05-01-Acciones-Personal.pdf
    │   ├── IC-RH-F-05-02-Prestamo.pdf
    │   ├── IC-RH-F-05-03-Vacaciones.pdf
    │   ├── IC-RH-F-05-04-Amonestacion.pdf
    │   └── IC-RH-F-05-05-Reclamo-Pago.pdf
    │
    ├── generales/
    │   ├── IC-RH-F-00-01-Alcoholimetro.doc
    │   ├── IC-RH-F-00-02-Matriz-PNC.xls
    │   ├── IC-RH-F-00-03-Matriz-NC.xls
    │   ├── IC-RH-F-00-04-Entrega-Combustible.pdf
    │   ├── IC-RH-F-00-05-Entrevista-Salida.pdf
    │   ├── IC-RH-F-00-06-Referencias-Laborales.pdf
    │   ├── IC-RH-F-00-07-Actualizacion-Datos.pdf
    │   ├── IC-RH-F-00-08-Permiso-Horas.doc
    │   └── formatos-no-iso/
    │       ├── Control-Pago-Horas.xls
    │       ├── Solicitud-Dia-Libre.doc
    │       ├── Acuerdo-Pago.docx
    │       └── Calculo-ISR.xlsx
    │
    └── externos/
        ├── assa/
        ├── banco/
        ├── css/
        └── sindicato/
```

Total esperado: ~47 archivos. Los `externos/` son trámites de terceros (CSS, ASSA, Sindicato, Banco) — referencia visual, no se digitalizan en HumanOS.
