import { defineConfig } from "vitepress";

export default defineConfig({
  title: "OpenFeed",
  description: "A self-hosted news and social media aggregator",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/" },
      { text: "GitHub", link: "https://github.com/sampl/openfeed" },
    ],
    sidebar: [
      { text: "Overview", link: "/" },
      { text: "Installation", link: "/installation" },
      { text: "Configuration", link: "/configuration" },
      {
        text: "Connectors",
        items: [
          { text: "Overview", link: "/connectors/" },
          { text: "Supported connectors", link: "/connectors/supported" },
          { text: "Writing a custom connector", link: "/connectors/custom" },
        ],
      },
      { text: "API", link: "/api" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/sampl/openfeed" },
    ],
  },
});
