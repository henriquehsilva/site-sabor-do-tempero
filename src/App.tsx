import React from 'react';
import { ChefHat, Clock, Phone, MapPin, UtensilsCrossed } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="relative h-screen">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")',
          }}
        >
          <div className="absolute inset-0 bg-secondary bg-opacity-50"></div>
        </div>
        
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center space-x-2">
            {/* <ChefHat size={32} className="text-gold" /> */}
            <img src="/logo.png" alt="Sabor do Tempero" className="w-40 h-40" />
            {/* <span className="text-2xl font-bold text-white">Sabor do Tempero</span> */}
          </div>
          {/* <div className="hidden md:flex space-x-8 text-white">
            <a href="#menu" className="hover:text-gold transition">Menu</a>
            <a href="#about" className="hover:text-gold transition">About</a>
            <a href="#contact" className="hover:text-gold transition">Contact</a>
          </div> */}
        </nav>

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Comida Caseira Autêntica
            <br />
            Entregue na Sua Porta
          </h1>
          <p className="text-xl text-accent mb-8 max-w-2xl">
            Experimente o aconchego e o conforto da culinária caseira tradicional com nossas refeições cuidadosamente preparadas
          </p>
          <button className="bg-primary hover:bg-opacity-90 text-white px-8 py-3 rounded-full text-lg font-semibold transition">
            Peça Agora
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 px-6 lg:px-12 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-accent bg-opacity-10">
            <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Feito com Amor</h3>
            <p className="text-brown">Cada prato é preparado com carinho, usando receitas tradicionais</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-accent bg-opacity-10">
            <Clock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Entrega Rápida</h3>
            <p className="text-brown">Comida quente e fresca entregue em até 45 minutos</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-accent bg-opacity-10">
            <UtensilsCrossed className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Pratos do Dia</h3>
            <p className="text-brown">Novas especialidades caseiras todos os dias</p>
          </div>
        </div>
      </section>

      {/* Popular Dishes Section */}
      <section className="py-16 px-6 lg:px-12 bg-accent bg-opacity-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-secondary text-center mb-12">Nossos Pratos Populares</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Feijoada Completa",
                image: "/feijoada.jpg",
                details: "Feijoada, Arroz, Couve, Farofa, Laranja e Torresmo",
                price: ""
              },
              {
                name: "Rabada com Agrião",
                image: "/rabada.jpg",
                details: "Rabada, Agrião, Arroz e Farofa",
                price: ""
              },
              {
                name: "Frango Assado",
                image: "/frango.jpg",
                details: "Frango Assado, Batata, Arroz e Salada",
                price: ""
              }
            ].map((dish, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-lg">
                <img src={dish.image} alt={dish.name} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-secondary mb-2">{dish.name}</h3>
                  <p className="text-brown mb-4">{dish.details}</p>
                  <p className="text-primary font-bold">{dish.price}</p>
                  {/* <button className="mt-4 w-full bg-brown hover:bg-opacity-90 text-white py-2 rounded transition">
                    {dish.price ? "Adicionar ao Carrinho" : "Ver Detalhes"}
                  </button> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 lg:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-secondary mb-12">Entre em Contato</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Phone className="w-6 h-6 text-primary" />
                <span className="text-brown">(64) 99213-8817</span>
              </div>
              <div className="flex items-center space-x-4">
                <MapPin className="w-6 h-6 text-primary" />
                <span className="text-brown">Alameda da Garças, Qd. 17, Lt. 13, Fauna I - Rio Quente/GO</span>
              </div>
              <div className="bg-accent bg-opacity-10 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-secondary mb-4">Horário de Funcionamento</h3>
                <p className="text-brown">Segunda - Sexta: 11:00 AM - 15:00 PM</p>
                <p className="text-brown">Sábado - Domingo: 9:00 PM - 15:00 PM</p>
              </div>
            </div>
            {/* <form className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-2 rounded border border-brown focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="email"
                placeholder="Your Email"
                className="w-full px-4 py-2 rounded border border-brown focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                placeholder="Your Message"
                rows={4}
                className="w-full px-4 py-2 rounded border border-brown focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
              <button className="w-full bg-primary hover:bg-opacity-90 text-white py-3 rounded font-semibold transition">
                Send Message
              </button>
            </form> */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-white py-8 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            {/* <ChefHat size={24} className="text-gold" />
            <span className="text-xl font-bold">Sabor do Tempero</span> */}
            <img src="/logo_fundo_escuro.png" alt="Sabor do Tempero" className="w-20 h-20" />
          </div>
          <div className="text-sm text-accent">
            © 2025 Sabor do Tempero. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;