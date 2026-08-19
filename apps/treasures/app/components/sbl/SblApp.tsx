/* The sheet, exactly the markup of the SBL Edition original.

   It is rendered as static JSX and then driven imperatively by initSbl(): the
   lesson body, the marks and the reader's own notes are DOM the engine builds
   and edits through Range/Selection/TreeWalker, which is what makes a stroke
   able to start mid-word in one paragraph and end in another. Rebuilding that
   as React state would be a rewrite of the part with the most behaviour in it,
   so React owns the shell and the engine owns what stands inside it. */
'use client';

import { useEffect } from 'react';
import { initSbl } from '../../lib/sbl';

export default function SblApp({ apiUrl }: { apiUrl: string }) {
  useEffect(() => {
    /* The sheet's own bar has to sit under the site's navigation, and the
       navigation's height is not a constant: --nav-h in globals.css is an
       arithmetic guess that already drifts from what the navbar actually
       renders (67px against 78px), and it would drift again the next time the
       nav changes. Measured here instead, and re-measured when the window
       resizes, so the two bars can never overlap. */
    const nav = document.querySelector<HTMLElement>('nav.site-nav');
    const measure = () => {
      if (!nav) return;
      document.documentElement.style.setProperty('--sbl-nav-h', Math.round(nav.getBoundingClientRect().height) + 'px');
    };
    measure();
    window.addEventListener('resize', measure);

    /* The engine binds to document and window and writes to <html> and <body>,
       so leaving the lesson has to undo that — this is a route in an app, not a
       page of its own, and the reader goes back to the catalogue without the
       browser reloading anything. `initSbl` hands back the undo. */
    const disposeSbl = initSbl({ apiUrl });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sbl-sw.js', { scope: '/' }).catch(() => {});

    return () => {
      window.removeEventListener('resize', measure);
      document.documentElement.style.removeProperty('--sbl-nav-h');
      disposeSbl();
    };
  }, [apiUrl]);

  return (
    <>
      <div className="bar">
        <div className="bar-in">
          <div className="lbl" id="wk" title="">
            —
          </div>
          <div className="gear" id="gear" title="">
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8.5" cy="8.5" r="2.4" />
              <path d="M13.4 10.6a1.1 1.1 0 0 0 .22 1.22l.04.04a1.34 1.34 0 1 1-1.9 1.9l-.04-.04a1.1 1.1 0 0 0-1.22-.22 1.1 1.1 0 0 0-.67 1v.11a1.34 1.34 0 0 1-2.68 0v-.06a1.1 1.1 0 0 0-.72-1 1.1 1.1 0 0 0-1.22.22l-.04.04a1.34 1.34 0 1 1-1.9-1.9l.04-.04a1.1 1.1 0 0 0 .22-1.22 1.1 1.1 0 0 0-1-.67h-.11a1.34 1.34 0 0 1 0-2.68h.06a1.1 1.1 0 0 0 1-.72 1.1 1.1 0 0 0-.22-1.22l-.04-.04a1.34 1.34 0 1 1 1.9-1.9l.04.04a1.1 1.1 0 0 0 1.22.22h.05a1.1 1.1 0 0 0 .67-1v-.11a1.34 1.34 0 0 1 2.68 0v.06a1.1 1.1 0 0 0 .67 1 1.1 1.1 0 0 0 1.22-.22l.04-.04a1.34 1.34 0 1 1 1.9 1.9l-.4.04a1.1 1.1 0 0 0-.22 1.22v.05a1.1 1.1 0 0 0 1 .67h.11a1.34 1.34 0 0 1 0 2.68h-.06a1.1 1.1 0 0 0-1 .67Z" />
            </svg>
          </div>
        </div>
        <div className="calpop" id="calpop" hidden={true}></div>
        <div className="setpop" id="setpop" hidden={true}>
          <div className="srow">
            <span className="slab" id="lab-lang"></span>
            <div className="langseg" id="langseg"></div>
          </div>
          <div className="srow">
            <span className="slab" id="lab-verses"></span>
            <div className="sctl">
              <div className="tog ic" id="tog">
                <svg
                  width="16"
                  height="15"
                  viewBox="0 0 16 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.45"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5.6 3.2c-1.9.7-3 2.3-3 4.3 0 1.6 1 2.7 2.4 2.7 1.2 0 2.1-.9 2.1-2.1 0-1.1-.8-2-1.9-2-.2 0-.4 0-.5.1.2-1 .9-1.8 1.9-2.2ZM12.6 3.2c-1.9.7-3 2.3-3 4.3 0 1.6 1 2.7 2.4 2.7 1.2 0 2.1-.9 2.1-2.1 0-1.1-.8-2-1.9-2-.2 0-.4 0-.5.1.2-1 .9-1.8 1.9-2.2Z" />
                </svg>
              </div>
              <div className="tog vlines" id="vlines"></div>
              <div className="tog ic" id="paratog" hidden={true}>
                <svg
                  width="16"
                  height="14"
                  viewBox="0 0 16 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                >
                  <path d="M1 2.4h5M1 5.9h5M1 9.4h3.4" />
                  <path d="M10 2.4h5M10 5.9h5M10 9.4h3.4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="srow prow" id="para-row" hidden={true}>
            <span className="slab" id="lab-second"></span>
            <select className="ssel" id="para-sel"></select>
          </div>
          <div className="srow" id="dual-row" hidden={true}>
            <span className="slab" id="lab-dual"></span>
            <div className="sctl">
              <div className="sw2" id="dual-sw">
                <i></i>
              </div>
            </div>
          </div>
          <div className="srow prow" id="dual-lang-row" hidden={true}>
            <span className="slab" id="lab-duallang"></span>
            <div className="langseg" id="dualseg"></div>
          </div>
          <div className="srow">
            <span className="slab" id="lab-size"></span>
            <div className="sctl">
              <div className="zoom" id="zoomout">
                A−
              </div>
              <div className="zoom" id="zoomin">
                A+
              </div>
            </div>
          </div>
          <div className="srow">
            <span className="slab" id="lab-colour"></span>
            <div className="swatches" id="tintpop"></div>
          </div>
          <div className="srow prow" id="hue-row" hidden={true}>
            <div className="huebar" id="huebar">
              <i></i>
            </div>
          </div>
          <div className="srow">
            <span className="slab" id="lab-paper"></span>
            <select className="ssel short" id="paper-sel"></select>
          </div>
          <div className="srow">
            <span className="slab" id="lab-mark"></span>
            <div className="sctl">
              <div className="sw2" id="mk-rail">
                <i></i>
              </div>
            </div>
          </div>
          <div className="srow">
            <span className="slab" id="lab-pdf"></span>
            <div className="sctl">
              <div className="sbtn pri" id="pdf-week"></div>
              <div className="sbtn" id="pdf-quarter"></div>
            </div>
          </div>
          <div className="sfoot">
            <span id="mk-ver"></span>
            <span id="mk-keys"></span>
          </div>
        </div>
      </div>

      <div id="sheets">
        <div className="page">
          <div className="msg">…</div>
        </div>
      </div>

      <div className="mtoast" id="mtoast"></div>
      <div className="keysback" id="keysback" hidden={true}></div>
      <div className="keyspop" id="keyspop" hidden={true}></div>

      <div className="rail" id="rail">
        <div className="two">
          <div className="rbtn" data-s="fill">
            <svg width="17" height="14" viewBox="0 0 17 14">
              <rect x="1.5" y="4" width="14" height="6.4" rx="1.4" fill="currentColor" opacity=".85" />
            </svg>
          </div>
          <div className="rbtn" data-s="tex">
            <svg width="17" height="14" viewBox="0 0 17 14">
              <path
                d="M1.6 5.2c3-.8 10-1.1 13.8-.4.5.1.7.5.6 1.2-.2 1.3-.5 2.6-.9 3.2-.3.4-1.2.5-2.6.6-4 .3-8.6.4-11 .1-.9-.1-1.3-.4-1.4-.9-.2-.9-.2-2.4 0-3.1.1-.4.3-.6.5-.7z"
                fill="currentColor"
                opacity=".85"
              />
            </svg>
          </div>
          <div className="rbtn" data-s="line">
            <svg
              width="17"
              height="14"
              viewBox="0 0 17 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M2 10.5c4-1.4 9-1.4 13 0" />
              <path d="M4 4.6h9" opacity=".35" />
            </svg>
          </div>
          <div className="rbtn" data-s="wave">
            <svg
              width="17"
              height="14"
              viewBox="0 0 17 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M2 9.4c1.6-2.2 3.2-2.2 4.8 0s3.2 2.2 4.8 0 3.2-2.2 4.4-.6" />
              <path d="M4 4.6h9" opacity=".35" />
            </svg>
          </div>
        </div>
        <div className="sep"></div>
        <div className="inks" id="inks"></div>
        <div className="sep"></div>
        <div className="two">
          <div className="rbtn own" data-mode="ins">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M7.5 2.6v9.8M2.6 7.5h9.8" />
            </svg>
          </div>
          <div className="rbtn own" data-mode="note">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M2.4 3.4h10.2M2.4 7h10.2M2.4 10.6h6" />
            </svg>
          </div>
          <div className="rbtn" data-mode="erase">
            <svg
              width="16"
              height="15"
              viewBox="0 0 16 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12.2h9.5M4.6 9.9 9.2 5.3l3.1 3.1-4.6 4.6H5.9z" />
            </svg>
          </div>
          <div className="rbtn" data-mode="copy">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4.6" y="4.6" width="8.8" height="8.8" rx="1.7" />
              <path d="M10.4 2.6h-8v8" />
            </svg>
          </div>
        </div>
        <div className="rpick" id="rpick" hidden={true}>
          <div className="area" id="mkarea">
            <i className="dot"></i>
          </div>
          <div className="hue" id="mkhue">
            <i className="dot"></i>
          </div>
        </div>
      </div>

      <div className="days" id="days"></div>

      <div id="load">
        <i></i>
      </div>
      <div className="hintchip" id="mkhint"></div>
      <div id="vpeek"></div>
      <div className="fmtbar" id="fmtbar" hidden={true}></div>

      <div className="railtab" id="railtab" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <i className="grip" id="gripS"></i>
      <i className="grip" id="gripE"></i>

      <div className="bub" id="bub">
        <span className="mtool" data-a="erase">
          <svg
            width="16"
            height="15"
            viewBox="0 0 16 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12.2h9.5M4.6 9.9 9.2 5.3l3.1 3.1-4.6 4.6H5.9z" />
          </svg>
        </span>
      </div>
      {/* The colophon is painted by the engine, in the language of the lesson —
          see FOOT/paintFoot. It is empty here rather than written in English,
          because a sheet read in Russian should not end in an English line. */}
      <footer>
        <div className="frule"></div>
        <div className="fkind" id="fkind"></div>
        <div className="fnote" id="fnote"></div>
        <div className="fset" id="fset"></div>
      </footer>
    </>
  );
}
