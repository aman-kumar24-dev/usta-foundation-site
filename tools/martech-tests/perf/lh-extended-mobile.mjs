// Lighthouse mobile config that keeps observing after load long enough to
// capture the EDS delayed phase (~3s setTimeout) where Launch is injected.
export default {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'best-practices'],
    pauseAfterLoadMs: 6000,
    networkQuietThresholdMs: 5000,
    cpuQuietThresholdMs: 5000,
  },
};
