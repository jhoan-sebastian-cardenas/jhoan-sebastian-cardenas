// scripts/update-projects.js
// Consulta la API de GitHub, toma tus repos mas recientes (sin forks)
// Genera tarjetas estilizadas ordenadas por última actualización
// y reemplaza el bloque entre los marcadores en README.md

const fs = require("fs");

const USERNAME = "jhoan-sebastian-cardenas";
const README_PATH = "README.md";
const MAX_PROJECTS = 4;

// Gradientes en tonos vino tinto/oscuros intercalados (similar al banner)
// Más oscuros y con mayor contraste
const GRADIENT_COLORS = [
  "135deg, #6a0a1a 0%, #1a0a0f 100%",      // Vino oscuro a negro
  "135deg, #5a1428 0%, #0f0a15 100%",      // Vino profundo a gris oscuro
  "135deg, #7a1a2e 0%, #1f0a15 100%",      // Vino bordeaux a negro
  "135deg, #4a0f1f 0%, #0d0609 100%",      // Vino muy oscuro a negro puro
  "135deg, #8a2a3e 0%, #2a0a1a 100%",      // Vino más rojo a negro
  "135deg, #5a0f25 0%, #0a0508 100%",      // Vino profundo a negro muy puro
];

let gradientIndex = 0;

function getNextGradient() {
  const gradient = GRADIENT_COLORS[gradientIndex % GRADIENT_COLORS.length];
  gradientIndex++;
  return gradient;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

function generateProjectCard(repo) {
  const gradient = getNextGradient();
  const lang = repo.language || "Sin especificar";
  const emoji = "📦";
  const desc = repo.description || "Sin descripción disponible";
  const lastUpdate = formatDate(repo.pushed_at);
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;

  return `<div style="background: linear-gradient(${gradient}); border-radius: 12px; padding: 20px; margin: 15px 0; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.3s ease;">
  <h3 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
    <span>${emoji}</span>
    <a href="${repo.html_url}" style="color: white; text-decoration: none; font-size: 1.2em;">${repo.name}</a>
  </h3>
  
  <p style="margin: 10px 0; font-size: 0.95em; opacity: 0.95;">${desc}</p>
  
  <div style="display: flex; gap: 10px; margin: 12px 0; flex-wrap: wrap;">
    <span style="background: rgba(255,255,255,0.25); padding: 5px 12px; border-radius: 20px; font-size: 0.85em;">💬 ${lang}</span>
    <span style="background: rgba(255,255,255,0.25); padding: 5px 12px; border-radius: 20px; font-size: 0.85em;">⏰ ${lastUpdate}</span>
    <span style="background: rgba(255,255,255,0.25); padding: 5px 12px; border-radius: 20px; font-size: 0.85em;">⭐ ${stars} stars</span>
    <span style="background: rgba(255,255,255,0.25); padding: 5px 12px; border-radius: 20px; font-size: 0.85em;">🔀 ${forks} forks</span>
  </div>
  
  <a href="${repo.html_url}" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px; border: 1px solid rgba(255,255,255,0.4); transition: all 0.3s ease;">
    Ver Repositorio →
  </a>
</div>`;
}

async function main() {
  gradientIndex = 0;  // Reset gradient index at start
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?sort=updated&direction=desc&per_page=100`,
    {
      headers: {
        "User-Agent": "readme-updater",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Error consultando GitHub API: ${res.status}`);
  }

  const repos = await res.json();

  // Filtrar sin forks ni privados, ordenar por última actualización (pushed_at)
  const filtered = repos
    .filter((r) => !r.fork && !r.private)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, MAX_PROJECTS);

  const cards = filtered
    .map((r) => generateProjectCard(r))
    .join("\n\n");

  const block = filtered.length
    ? cards
    : '<p align="center"><i>Aún no hay repositorios públicos que mostrar.</i></p>';

  const readme = fs.readFileSync(README_PATH, "utf8");

  const startMarker = "<!--PROJECTS:START-->";
  const endMarker = "<!--PROJECTS:END-->";

  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("No se encontraron los marcadores PROJECTS:START/END en README.md");
  }

  const newReadme =
    readme.slice(0, startIdx + startMarker.length) +
    "\n" +
    block +
    "\n" +
    readme.slice(endIdx);

  fs.writeFileSync(README_PATH, newReadme, "utf8");
  console.log(`README actualizado con ${filtered.length} proyectos en tarjetas estilizadas.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
