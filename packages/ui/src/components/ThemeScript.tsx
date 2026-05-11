// Runs synchronously in <head> before first paint. Order:
//   1. Read ?theme= from the URL (set by cross-app links so the theme survives
//      a hop between subdomains — localStorage is per-origin).
//   2. Fall back to localStorage.sdarm-theme.
//   3. Apply data-theme to <html>.
//   4. If the URL carried the param, persist it to localStorage and strip
//      it via history.replaceState so it doesn't litter the address bar.
const script = `(function(){try{var p=new URLSearchParams(location.search);var u=p.get('theme');var s=localStorage.getItem('sdarm-theme');var t=(u==='dark'||u==='light')?u:(s==='dark'||s==='light')?s:null;if(t)document.documentElement.setAttribute('data-theme',t);if(u==='dark'||u==='light'){localStorage.setItem('sdarm-theme',u);p.delete('theme');var q=p.toString();history.replaceState(null,'',location.pathname+(q?'?'+q:'')+location.hash)}}catch(e){}})()`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
