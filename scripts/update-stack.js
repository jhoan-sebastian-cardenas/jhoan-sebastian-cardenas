// scripts/update-stack.js
// Analiza todos tus repositorios públicos, detecta tecnologías usadas
// y actualiza el stack tecnológico ordenado por frecuencia de uso

const fs = require("fs");

const USERNAME = "jhoan-sebastian-cardenas";
const README_PATH = "README.md";

// Mapeo de extensiones/archivos a tecnologías
const TECH_PATTERNS = {
  java: { patterns: [/\.java$/, /pom\.xml/, /build\.gradle/], icon: "java" },
  javascript: { patterns: [/\.js$/, /package\.json/, /\.jsx$/], icon: "javascript" },
  typescript: { patterns: [/\.ts$/, /\.tsx$/, /tsconfig\.json/], icon: "typescript" },
  react: { patterns: [/react|React/, /"react":/], icon: "react" },
  "spring-boot": { patterns: [/spring-boot|springframework/, /pom\.xml/], icon: "spring" },
  nodejs: { patterns: [/node_modules|package\.json/, /\.js$/], icon: "nodejs" },
  html5: { patterns: [/\.html$/, /index\.html/], icon: "html5" },
  css3: { patterns: [/\.css$/, /\.scss$/, /\.less$/], icon: "css3" },
  postgresql: { patterns: [/postgres|postgresql/, /\.sql/], icon: "postgresql" },
  mysql: { patterns: [/mysql|MariaDB/, /\.sql/], icon: "mysql" },
  docker: { patterns: [/Dockerfile/, /docker-compose/], icon: "docker" },
  git: { patterns: [/\.git|\.gitignore/], icon: "git" },
  linux: { patterns: [/linux|ubuntu|bash/], icon: "linux" },
  postman: { patterns: [/postman|\.postman/], icon: "postman" },
};

async function fetchRepositories() {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?sort=created&direction=desc&per_page=100`,
    {
      headers: {
        "User-Agent": "stack-updater",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Error consultando GitHub API: ${res.status}`);
  }

  return await res.json();
}

async function analyzeRepository(repo) {
  const techs = {};

  try {
    // Intentar obtener del branch main, sino del default
    let treesRes = await fetch(
      `https://api.github.com/repos/${USERNAME}/${repo.name}/git/trees/main?recursive=1`,
      {
        headers: {
          "User-Agent": "stack-updater",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (treesRes.status === 404) {
      treesRes = await fetch(
        `https://api.github.com/repos/${USERNAME}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`,
        {
          headers: {
            "User-Agent": "stack-updater",
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        }
      );
    }

    if (!treesRes.ok) return techs;

    const filesData = await treesRes.json();
    const files = filesData.tree || [];

    // Analizar archivos encontrados
    files.forEach((file) => {
      const path = file.path;

      Object.entries(TECH_PATTERNS).forEach(([tech, config]) => {
        config.patterns.forEach((pattern) => {
          if (pattern.test(path)) {
            techs[tech] = (techs[tech] || 0) + 1;
          }
        });
      });
    });

    // Bonus por lenguaje del repositorio
    if (repo.language) {
      const lang = repo.language.toLowerCase();
      if (TECH_PATTERNS[lang]) {
        techs[lang] = (techs[lang] || 0) + 5;
      }
    }
  } catch (err) {
    console.warn(`Advertencia analizando ${repo.name}:`, err.message);
  }

  return techs;
}

async function calculateTechUsage() {
  const repos = await fetchRepositories();
  const publicRepos = repos.filter((r) => !r.fork && !r.private);

  const globalTechCount = {};

  // Analizar cada repositorio
  for (const repo of publicRepos.slice(0, 20)) {
    console.log(`Analizando ${repo.name}...`);
    const techsInRepo = await analyzeRepository(repo);

    Object.entries(techsInRepo).forEach(([tech, count]) => {
      globalTechCount[tech] = (globalTechCount[tech] || 0) + count;
    });
  }

  // Ordenar por frecuencia (mayor a menor)
  const sortedTechs = Object.entries(globalTechCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tech]) => tech);

  return sortedTechs;
}

function generateStackHTML(sortedTechs) {
  const icons = sortedTechs
    .map((tech) => {
      const icon = TECH_PATTERNS[tech]?.icon || tech;
      return `  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-original.svg" height="45" alt="${tech}"/>`;
    })
    .join("\n");

  return `<p align="center">\n${icons}\n</p>`;
}

async function main() {
  try {
    console.log("Calculando uso de tecnologías...");
    const sortedTechs = await calculateTechUsage();

    console.log("Tecnologías ordenadas:", sortedTechs);

    const stackHTML = generateStackHTML(sortedTechs);

    const readme = fs.readFileSync(README_PATH, "utf8");

    const startMarker = "<!--STACK:START-->";
    const endMarker = "<!--STACK:END-->";

    const startIdx = readme.indexOf(startMarker);
    const endIdx = readme.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      throw new Error("No se encontraron los marcadores STACK:START/END en README.md");
    }

    const newReadme =
      readme.slice(0, startIdx + startMarker.length) +
      "\n" +
      stackHTML +
      "\n" +
      readme.slice(endIdx);

    fs.writeFileSync(README_PATH, newReadme, "utf8");
    console.log(`Stack tecnológico actualizado en orden de uso.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
