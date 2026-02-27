export function App() {
  return (
    <main className="shell">
      <h1>React + PrismForge</h1>
      <p>This app is fully runnable and consumes workspace token artifacts.</p>
      <div className="actions">
        <button className="btn-primary">Continue</button>
        <button
          className="btn-secondary"
          onClick={() => {
            const root = document.documentElement;
            const nextBrand = root.dataset.brand === "acme" ? "nova" : "acme";
            const nextMode = root.dataset.mode === "light" ? "dark" : "light";
            root.dataset.brand = nextBrand;
            root.dataset.mode = nextMode;
          }}
        >
          Toggle Brand/Mode
        </button>
      </div>
    </main>
  );
}

export default App;

