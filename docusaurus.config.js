// @ts-check
// Docs for a fork of Tegola. Tegola itself is created and maintained by the
// Go Spatial team (https://github.com/go-spatial/tegola), MIT licensed; this
// site documents github.com/NivGreenstein/tegola.

import {themes as prismThemes} from 'prism-react-renderer';

const UPSTREAM_REPO = 'https://github.com/go-spatial/tegola';
const UPSTREAM_DOCS = 'https://tegola.io';
const FORK_REPO = 'https://github.com/NivGreenstein/tegola';
const DOCS_REPO = 'https://github.com/NivGreenstein/tegola-docs';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Tegola (fork)',
  tagline: 'Vector tiles with OGC API - Tiles, tile matrix sets and a layered cache',
  favicon: 'images/logo.png',

  // GitHub Pages project site. The workflow does not override these, so a local
  // `npm run build` produces exactly what is deployed.
  url: 'https://nivgreenstein.github.io',
  baseUrl: '/tegola-docs/',

  organizationName: 'NivGreenstein',
  projectName: 'tegola-docs',

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
        title: 'Tegola (fork)',
        logo: {
          alt: 'Tegola',
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
          {to: '/demo', label: 'Demo', position: 'left'},
          {to: '/support', label: 'Support', position: 'left'},
          {
            to: '/documentation/about-this-fork',
            label: 'About this fork',
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
              {label: 'About this fork', to: '/documentation/about-this-fork'},
              {label: 'Getting Started', to: '/documentation/getting-started'},
              {label: 'Configuration', to: '/documentation/configuration'},
              {label: 'OGC API - Tiles', to: '/documentation/ogc-api-tiles'},
            ],
          },
          {
            title: 'This fork',
            items: [
              {label: 'Source', href: FORK_REPO},
              {label: 'Download', to: '/download'},
              {label: 'Support', to: '/support'},
              {label: 'These docs', href: DOCS_REPO},
            ],
          },
          {
            title: 'Upstream Tegola',
            items: [
              {label: 'go-spatial/tegola', href: UPSTREAM_REPO},
              {label: 'Official docs (tegola.io)', href: UPSTREAM_DOCS},
              {label: 'Go Spatial', href: 'https://github.com/go-spatial'},
              {label: 'MIT license', href: `${UPSTREAM_REPO}/blob/master/LICENSE.md`},
            ],
          },
        ],
        copyright: [
          'These docs describe a <strong>fork</strong> of Tegola.',
          `Tegola is created and maintained by the <a href="https://github.com/go-spatial">Go Spatial</a> team and documented at <a href="${UPSTREAM_DOCS}">tegola.io</a>, under the liberal <a href="${UPSTREAM_REPO}/blob/master/LICENSE.md">MIT</a> license.`,
          'This fork is MIT licensed too, and all credit for Tegola belongs upstream.',
        ].join(' '),
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['toml', 'bash', 'json', 'sql'],
      },
    }),
};

export default config;
