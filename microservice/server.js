const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: 'Microservicio Pokémon funcionando' });
});

app.post('/pokemon', async (req, res) => {
  const pokemon = String(req.body.pokemon || '').trim().toLowerCase();

  if (!pokemon) {
    return res.status(400).json({ mensaje: 'Debes enviar un nombre o ID' });
  }

  try {
    const respuesta = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemon)}`
    );

    if (!respuesta.ok) {
      return res.status(404).json({ mensaje: 'Pokémon no encontrado' });
    }

    const datos = await respuesta.json();

    const pokemonLimpio = {
      id: datos.id,
      nombre: datos.name,
      imagen: datos.sprites.front_default,
      altura: datos.height,
      peso: datos.weight,
      tipos: datos.types.map((item) => item.type.name),
      movimientos: datos.moves.slice(0, 4).map((item) => item.move.name),
    };

    res.json(pokemonLimpio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar PokeAPI' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio ejecutándose en http://localhost:${PORT}`);
});
