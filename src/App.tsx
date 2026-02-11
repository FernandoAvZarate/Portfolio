import "./App.css";

function App() {
  return (
    <div className="layout">
      <footer className="footer">
        <div className="footer__wrapper">
          <p className="footer__p">© Fernando Zárate</p>
        </div>
      </footer>
      <main className="main">
        <div className="main__container--left">
          <div className="hero">
            <h1 className="name">Fernando Zárate</h1>
            <h2 className="subtitle">Developer & Designer</h2>
          </div>
          <div className="about">
            <p className="about__p">
              Desde San Juan, Argentina, diseño, compongo, construyo. No distingo entre un acorde, un trazo o una línea
              de código; para mí, todo es el mismo impulso de <span className="highlight">materializar</span> lo que
              antes no existía.
            </p>
            <p className="about__p">
              Persigo el <span className="highlight">equilibrio</span> entre el rigor y la estética. Me enfoco en crear
              interfaces simples y memorables, partiendo de la usabilidad y la eficiencia para alcanzar una forma que
              represente la <span className="highlight">identidad</span> del producto.
            </p>
          </div>
        </div>
        <div className="main__container--right"></div>
      </main>
      <header className="header">
        <div className="header__navbar">
          <a href="https://ejemplo.com" className="header__navbar--item" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a
            href="https://www.linkedin.com/in/fernandozaratedev/"
            className="header__navbar--item"
            target="_blank"
            rel="noopener noreferrer">
            Linkedin
          </a>
          <a href="https://ejemplo.com" className="header__navbar--item" target="_blank" rel="noopener noreferrer">
            Github
          </a>
          <a href="https://ejemplo.com" className="header__navbar--item" target="_blank" rel="noopener noreferrer">
            Contacto
          </a>
        </div>
      </header>
    </div>
  );
}
export default App;
