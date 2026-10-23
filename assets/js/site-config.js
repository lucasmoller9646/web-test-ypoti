/* =========================================================
   Configuración del sitio Ypoti
   ---------------------------------------------------------
   APPS_SCRIPT_URL
     Vacío  -> el sitio lee los textos de data/textos.csv y los
               ajustes de data/config.csv (archivos del repositorio).
     Con la URL de la aplicación web de Apps Script
            -> el sitio lee los textos y ajustes directamente de la
               planilla de Google (hojas "textos" y "config") y guarda
               los formularios enviados en la hoja "leads".
     Si la planilla no responde, el sitio usa los CSV del repositorio.
   ========================================================= */
window.YPOTI_CONFIG = {
  APPS_SCRIPT_URL: '',
  TEXTOS_CSV: 'data/textos.csv',
  CONFIG_CSV: 'data/config.csv',
  IDIOMAS: ['es', 'pt', 'en', 'de', 'gn'],
  IDIOMA_POR_DEFECTO: 'es',
  // true = el primer ingreso se abre en el idioma del navegador del visitante (si es pt, en, de o gn)
  DETECTAR_IDIOMA_DEL_NAVEGADOR: false
};
