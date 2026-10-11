// Lighthouse desktop config (mirrors the built-in desktop preset) that keeps
// observing after load long enough to capture the EDS delayed phase (~3s).
export default {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'best-practices'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    screenEmulation: {
      mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false,
    },
    emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    pauseAfterLoadMs: 6000,
    networkQuietThresholdMs: 5000,
    cpuQuietThresholdMs: 5000,
  },
};
