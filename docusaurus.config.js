// @ts-check
// Documentation for Shigola, a vector tile server.
// Source: https://github.com/MapColonies/shigola

import {themes as prismThemes} from 'prism-react-renderer';

const FORK_REPO = 'https://github.com/MapColonies/shigola';
const DOCS_REPO = 'https://github.com/MapColonies/shigola-docs';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Shigola',
  tagline: 'Vector tiles with OGC API - Tiles, tile matrix sets and a layered cache',
  favicon: 'images/logo.png',

  // GitHub Pages project site. The workflow does not override these, so a local
  // `npm run build` produces exactly what is deployed.
  url: 'https://mapcolonies.github.io',
  baseUrl: '/shigola-docs/',

  organizationName: 'MapColonies',
  projectName: 'shigola-docs',

  // A broken internal link should fail the build, not ship. This is what
  // replaces Hugo's ref shortcode, which errored on an unresolvable target.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  markdown: {
    // `.md` is parsed as CommonMark, `.mdx` as MDX. Without this every `.md`
    // file is MDX, and MDX reads `{z}/{x}/{y}` — which these docs are full of —
    // as a JSX expression and fails on the undefined identifier.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          // Keeps the URLs the Hugo site published: /documentation/<slug>.
          routeBasePath: 'documentation',
          sidebarPath: './sidebars.js',
          editUrl: `${DOCS_REPO}/edit/master/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'tutorials',
        path: 'tutorials',
        routeBasePath: 'tutorials',
        sidebarPath: './sidebarsTutorials.js',
        editUrl: `${DOCS_REPO}/edit/master/`,
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'images/logo.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Shigola',
        logo: {
          alt: 'Shigola',
          src: 'images/logo.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'documentation',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'docSidebar',
            docsPluginId: 'tutorials',
            sidebarId: 'tutorials',
            position: 'left',
            label: 'Tutorials',
          },
          {to: '/support', label: 'Support', position: 'left'},
          {
            to: '/documentation/about',
            label: 'About Shigola',
            position: 'right',
          },
          {to: '/download', label: 'Download', position: 'right'},
          {
            href: FORK_REPO,
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'About Shigola', to: '/documentation/about'},
              {label: 'Getting Started', to: '/documentation/getting-started'},
              {label: 'Configuration', to: '/documentation/configuration'},
              {label: 'OGC API - Tiles', to: '/documentation/ogc-api-tiles'},
            ],
          },
          {
            title: 'Shigola',
            items: [
              {label: 'Source', href: FORK_REPO},
              {label: 'Download', to: '/download'},
              {label: 'Support', to: '/support'},
              {label: 'These docs', href: DOCS_REPO},
            ],
          },
        ],
        copyright:
          'Shigola is maintained by <a href="https://github.com/MapColonies">MapColonies</a> and is MIT licensed.',
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['toml', 'bash', 'json', 'sql'],
      },
    }),
};

export default config;
