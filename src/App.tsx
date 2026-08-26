function App() {
  const menuOptions = [
    {
      id: 1,
      name: "Opção 1",
      main: "Estrogonoff de Frango",
      sides: ["Arroz Branco", "Batata Palha"],
    },
    {
      id: 2,
      name: "Opção 2",
      main: "Isca de Frango",
      sides: ["Arroz Branco", "Feijão em Caldo", "Panqueca de Frango", "Batata Rústica"],
    },
    {
      id: 3,
      name: "Opção 3",
      main: "Costela Bovina Assada na Panela",
      sides: ["Arroz Branco", "Feijão em Caldo", "Panqueca de Frango", "Batata Rústica"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-800 mb-2">
            🍽️ Sabor do Tempero
          </h1>
          <p className="text-lg text-amber-600">Cardápio do Dia</p>
          <div className="mt-4 inline-block bg-amber-600 text-white px-6 py-2 rounded-full font-bold text-xl">
            R$ 24,00
          </div>
        </header>

        <div className="space-y-4">
          {menuOptions.map((option) => (
            <div
              key={option.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="bg-amber-500 text-white px-4 py-2 font-bold">
                {option.name}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  {option.main}
                </h3>
                <ul className="space-y-2">
                  {option.sides.map((side, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <span className="w-2 h-2 bg-amber-400 rounded-full mr-3"></span>
                      {side}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <footer className="text-center mt-8 text-amber-700">
          <p className="text-sm">Peça já o seu!</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
