// Les robots (Googlebot rend le JS avec navigator.language = en-US) doivent
// toujours voir la version FR : sans cela, la détection de langue du navigateur
// bascule la page en EN après hydratation et Google indexe des extraits EN.
const CRAWLER_RE =
  /bot|crawl|spider|slurp|googlebot|bingpreview|facebookexternalhit|lighthouse|headless|gptbot|claude|perplexity|duckduck|yandex|baidu/i;

export function isCrawlerUserAgent(ua: string | undefined | null): boolean {
  return !!ua && CRAWLER_RE.test(ua);
}
