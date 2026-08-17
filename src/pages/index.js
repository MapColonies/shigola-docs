import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';

import styles from './index.module.css';

// The Hugo site put a live tegola map behind the hero. It is a standalone
// document in static/, so it survives the move as an iframe rather than being
// rebuilt as a component.
function Hero() {
  const {siteConfig} = useDocusaurusContext();
  const mapUrl = useBaseUrl('/homeMap.html');

  return (
    <header className={styles.hero}>
      <iframe
        src={mapUrl}
        className={styles.heroMap}
        title="A tegola-served vector map"
        // Decorative: the page is fully usable without it.
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className={styles.heroOverlay}>
        <div className="container">
          <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
          <p className={styles.heroTagline}>{siteConfig.tagline}</p>
          <div className={styles.heroButtons}>
            <Link
              className="button button--primary button--lg"
              to="/documentation/getting-started">
              Get Started
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/demo">
              Try it
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function ForkNotice() {
  return (
    <div className={styles.forkNotice}>
      <div className="container">
        <p>
          <strong>This is a fork of Tegola.</strong>{' '}
          <a href="https://github.com/go-spatial/tegola">Tegola</a> is created and
          maintained by the{' '}
          <a href="https://github.com/go-spatial">Go Spatial</a> team and
          documented at <a href="https://tegola.io">tegola.io</a>. This site
          documents{' '}
          <a href="https://github.com/NivGreenstein/tegola">
            NivGreenstein/tegola
          </a>{' '}
          — everything upstream Tegola does, plus three additions.{' '}
          <Link to="/documentation/about-this-fork">Read more</Link>.
        </p>
      </div>
    </div>
  );
}

const ADDED = [
  {
    title: 'OGC API - Tiles',
    to: '/documentation/ogc-api-tiles',
    body:
      'A standards-compliant tile API alongside the native routes — landing page, ' +
      'collections, tilesets and tiles. Verified against the OGC CITE test suite.',
  },
  {
    title: 'Tile matrix sets',
    to: '/documentation/tile-matrix-sets',
    body:
      'Three OGC tiling schemes — WebMercatorQuad, WorldCRS84Quad and WGS1984Quad — ' +
      'selectable per map, where upstream serves one.',
  },
  {
    title: 'Layered cache',
    to: '/documentation/layered-cache',
    body:
      'An ordered chain of cache backends with read-through promotion, per-tier ' +
      'read deadlines and writes that never block a response.',
  },
];

const UPSTREAM = [
  'Simple to set up. All you need is the Tegola binary and a config file.',
  'Extensible. Multiple data providers — PostGIS, GeoPackage and SAP HANA.',
  'Open source, MIT licensed, and hosted on GitHub.',
  'Parallelized. Tegola uses all available CPUs.',
  'Written in Go: highly concurrent, lightweight and easy to deploy.',
];

export default function Home() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Documentation for a fork of Tegola — OGC API - Tiles, tile matrix sets and a layered cache">
      <Hero />
      <ForkNotice />
      <main>
        <section className={styles.section}>
          <div className="container">
            <h2>Added by this fork</h2>
            <div className="row">
              {ADDED.map((f) => (
                <div key={f.title} className={clsx('col col--4', styles.cardCol)}>
                  <div className={clsx('card', styles.card)}>
                    <div className="card__header">
                      <h3>{f.title}</h3>
                    </div>
                    <div className="card__body">
                      <p>{f.body}</p>
                    </div>
                    <div className="card__footer">
                      <Link className="button button--secondary button--block" to={f.to}>
                        Read
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={clsx(styles.section, styles.sectionAlt)}>
          <div className="container">
            <h2>From Tegola</h2>
            <ul className={styles.featureList}>
              {UPSTREAM.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </Layout>
  );
}
