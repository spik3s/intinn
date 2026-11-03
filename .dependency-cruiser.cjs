/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "modules-not-to-http",
      severity: "error",
      from: { path: "^apps/bot/src/modules/" },
      to: { path: "^apps/bot/src/http/" },
    },
    {
      name: "shared-not-to-modules",
      severity: "error",
      from: { path: "^apps/bot/src/(lib|db|jobs)/" },
      to: { path: "^apps/bot/src/modules/" },
    },
    {
      name: "module-internals-private",
      comment: "Modules talk to each other only through index.ts.",
      severity: "error",
      from: { path: "^apps/bot/src/modules/([^/]+)/" },
      to: {
        path: "^apps/bot/src/modules/[^/]+/",
        pathNot: [
          "^apps/bot/src/modules/$1/",
          "^apps/bot/src/modules/[^/]+/index\\.ts$",
        ],
      },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: `${__dirname}/apps/bot/tsconfig.json` },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
