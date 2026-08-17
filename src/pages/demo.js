import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';

import styles from './demo.module.css';

// static/map.html is a standalone tegola-backed map, carried over from the Hugo
// site unchanged. Keeping it in an iframe means the demo does not have to be
// ported to React, and the map's own libraries stay out of the site bundle.
export default function Demo() {
  const mapUrl = useBaseUrl('/map.html');

  return (
    <Layout
      title="Demo"
      description="A live map served by tegola"
      noFooter>
      <iframe src={mapUrl} className={styles.map} title="Tegola demo map" />
    </Layout>
  );
}
