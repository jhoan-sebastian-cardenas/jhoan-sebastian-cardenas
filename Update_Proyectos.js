// scripts/update-projects.js
// Consulta la API de GitHub, toma tus repos mas recientes (sin forks)
// y reemplaza el bloque entre los marcadores en README.md

const fs = require("fs");

const USERNAME = "jhoan-sebastian-cardenas";
const README_PATH = "README.md";
const MAX_PROJECTS = 5;

async function main() {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?sort=created&direction=desc&per_page=100`,
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

  const filtered = repos
    .filter((r) => !r.fork && !r.private)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, MAX_PROJECTS);

  const lines = filtered.map((r) => {
    const desc = r.description ? r.description : "Sin descripción";
    const lang = r.language ? ` \`${r.language}\`` : "";
    return `- **[${r.name}](${r.html_url})**${lang} — ${desc}`;
  });

  const block = lines.length
    ? lines.join("\n")
    : "_Aún no hay repositorios públicos que mostrar._";

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
  console.log(`README actualizado con ${filtered.length} proyectos.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});