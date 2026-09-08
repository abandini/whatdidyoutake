import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://whatdidyoutake.org',
  trailingSlash: 'never',
  build: {
    // 'file' emits dist/emergency.html, which Cloudflare Pages serves at
    // /emergency with NO redirect. 'directory' emits emergency/index.html,
    // which Pages 308s to /emergency/ — that would make every canonical URL on
    // the site a redirect, break the `/emergency` rule in _headers, and add a
    // round trip for a reader on cellular. Must stay 'file'.
    format: 'file',
    // MUST stay 'never'. SPEC 3 §4 sets `style-src 'self'`, which blocks inline
    // <style>. Astro's default ('auto') inlines small stylesheets and would
    // silently break every page under that CSP.
    inlineStylesheets: 'never',
  },
  compressHTML: true,
  prefetch: false,
  devToolbar: { enabled: false },
  markdown: {
    syntaxHighlight: false,
    smartypants: true,
  },
});
