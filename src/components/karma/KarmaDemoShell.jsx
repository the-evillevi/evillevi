import React from "react";

import ComandaApp from "./ComandaApp.jsx";
import PosApp from "./PosApp.jsx";
import { KARMA_RESET_EVENT, KARMA_STORAGE_KEY, resetKarmaState } from "./persistence.js";
import "./styles.css";

function DemoToolbar({ station }) {
  const reset = () => {
    if (!window.confirm("¿Restablecer todos los datos de la demo de Karma?")) return;
    resetKarmaState(window.localStorage, window);
  };

  return (
    <nav className="karma-demo-toolbar" aria-label="Controles de la demo Karma">
      <span className="karma-demo-toolbar__title">Karma POS · Demo interactiva</span>
      <span className="karma-demo-toolbar__pins">PIN: Marcela 1111 · Iván 2222 · Sofía 3333</span>
      <a href="/projects/karma" aria-current={station === "pos" ? "page" : undefined}>
        Caja
      </a>
      <a href="/projects/karma/comanda" aria-current={station === "comanda" ? "page" : undefined}>
        Comanda
      </a>
      <a
        href={station === "pos" ? "/projects/karma/comanda" : "/projects/karma"}
        target="_blank"
        rel="noreferrer"
      >
        Abrir otra estación ↗
      </a>
      <button className="karma-demo-toolbar__reset" type="button" onClick={reset}>
        Restablecer demo
      </button>
    </nav>
  );
}

function KarmaDemoShell({ station }) {
  const [instance, setInstance] = React.useState(0);

  React.useEffect(() => {
    const remount = () => setInstance((value) => value + 1);
    const remountAfterRemoteReset = (event) => {
      if (event.key === KARMA_STORAGE_KEY && event.newValue === null) remount();
    };
    window.addEventListener(KARMA_RESET_EVENT, remount);
    window.addEventListener("storage", remountAfterRemoteReset);
    return () => {
      window.removeEventListener(KARMA_RESET_EVENT, remount);
      window.removeEventListener("storage", remountAfterRemoteReset);
    };
  }, []);

  return (
    <div className={`karma-app karma-app--${station}`}>
      <DemoToolbar station={station} />
      {station === "pos" ? (
        <PosApp key={instance} vistaCatalogo="cuadricula" mostrarAgotados propinaInicial="0" />
      ) : (
        <ComandaApp key={instance} />
      )}
    </div>
  );
}

export function KarmaPosIsland() {
  return <KarmaDemoShell station="pos" />;
}

export function KarmaComandaIsland() {
  return <KarmaDemoShell station="comanda" />;
}
