const fs = require("fs");
const path = require("path");

const CONTROLLERS_DIR = path.join(__dirname, "..", "src", "modules");

const modules = fs.readdirSync(CONTROLLERS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe("Controllers must not import raw prisma", () => {
  for (const mod of modules) {
    const controllerPath = path.join(CONTROLLERS_DIR, mod, `${mod}.controller.js`);
    if (!fs.existsSync(controllerPath)) continue;

    test(`${mod}.controller.js does not import raw prisma`, () => {
      const content = fs.readFileSync(controllerPath, "utf-8");
      const lines = content.split("\n");
      const offendingLines = lines
        .map((line, i) => ({ line: line.trim(), num: i + 1 }))
        .filter(({ line }) =>
          line.match(/require\(["']\.\.\/\.\.\/config\/prisma["']\)/) ||
          line.match(/from ["']\.\.\/\.\.\/config\/prisma["']/)
        );

      if (offendingLines.length > 0) {
        const details = offendingLines
          .map(({ line, num }) => `  Line ${num}: ${line}`)
          .join("\n");
        throw new Error(
          `Controllers must use req.tenantPrisma or injected DB access.\nFound raw prisma import in ${mod}.controller.js:\n${details}`
        );
      }
    });
  }
});
