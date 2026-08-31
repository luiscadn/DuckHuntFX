/** One-time injection of the CSS used by the in-scene DOM forms (login / registro). */

import { CSSVars } from "../art/palette";

let injected = false;

export function injectDomStyles(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = `
  .dh-card {
    width: 340px;
    padding: 22px;
    background: ${CSSVars.paper};
    color: ${CSSVars.ink};
    border: 4px solid ${CSSVars.ink};
    box-shadow: 8px 8px 0 rgba(11,16,38,0.45);
    font-family: "Press Start 2P", ui-monospace, monospace;
    image-rendering: pixelated;
  }
  .dh-card h2 {
    margin: 0 0 14px;
    font-size: 15px;
    color: ${CSSVars.rust};
    letter-spacing: 1px;
  }
  .dh-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
  .dh-tab {
    flex: 1;
    padding: 9px 4px;
    font: inherit;
    font-size: 9px;
    cursor: pointer;
    background: ${CSSVars.inkSoft};
    color: #cfc7ac;
    border: 3px solid ${CSSVars.ink};
  }
  .dh-tab.active { background: ${CSSVars.gold}; color: ${CSSVars.ink}; }
  .dh-field { margin-bottom: 12px; }
  .dh-field label { display: block; font-size: 8px; margin-bottom: 6px; letter-spacing: 1px; }
  .dh-input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    font: inherit;
    font-size: 11px;
    background: #fff;
    color: ${CSSVars.ink};
    border: 3px solid ${CSSVars.ink};
    outline: none;
  }
  .dh-input:focus { border-color: ${CSSVars.rust}; }
  .dh-btn {
    width: 100%;
    padding: 13px;
    margin-top: 4px;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    background: ${CSSVars.rust};
    color: ${CSSVars.paper};
    border: 3px solid ${CSSVars.ink};
    box-shadow: 4px 4px 0 rgba(11,16,38,0.4);
  }
  .dh-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 rgba(11,16,38,0.4); }
  .dh-error { min-height: 26px; margin-top: 10px; font-size: 8px; line-height: 1.5; color: ${CSSVars.blood}; }
  .dh-ghost {
    display: block;
    margin-top: 12px;
    font-size: 8px;
    text-align: center;
    color: ${CSSVars.inkSoft};
    text-decoration: underline;
    cursor: pointer;
    background: none;
    border: none;
    width: 100%;
    font-family: inherit;
  }
  .dh-hidden { display: none; }
  `;
  document.head.appendChild(style);
}
