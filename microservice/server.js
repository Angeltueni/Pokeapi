const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: 'Microservicio funcionando' });
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
      imagen2: datos.sprites.back_default,
      imagen3: datos.sprites.front_shiny,
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

app.post('/dragonball', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();

  if (!nombre) {
    return res.status(400).json({ mensaje: 'Debes enviar el nombre de un personaje' });
  }

  try {
    const respuestaBusqueda = await fetch(
      `https://dragonball-api.com/api/characters?name=${encodeURIComponent(nombre)}`
    );

    if (!respuestaBusqueda.ok) {
      return res.status(404).json({ mensaje: 'Personaje no encontrado' });
    }

    const resultadoBusqueda = await respuestaBusqueda.json();
    const encontrado = Array.isArray(resultadoBusqueda)
      ? resultadoBusqueda[0]
      : resultadoBusqueda.items?.[0];

    if (!encontrado) {
      return res.status(404).json({ mensaje: 'Personaje no encontrado' });
    }

    const respuestaDetalle = await fetch(
      `https://dragonball-api.com/api/characters/${encontrado.id}`
    );

    const datos = respuestaDetalle.ok
      ? await respuestaDetalle.json()
      : encontrado;

    const transformaciones = Array.isArray(datos.transformations)
      ? datos.transformations
      : [];

    const razasEnEspanol = {
      Saiyan: 'Saiyajin',
      Human: 'Humano',
      Namekian: 'Namekiano',
      Android: 'Androide',
      Majin: 'Majin',
      God: 'Dios',
      Angel: 'Ángel',
      Evil: 'Maligno',
      Unknown: 'Desconocida',
      'Frieza Race': 'Raza de Freezer',
    };

    const generosEnEspanol = {
      Male: 'Masculino',
      Female: 'Femenino',
      Unknown: 'Desconocido',
    };

    const personaje = {
      id: datos.id,
      nombre: datos.name,
      imagen: datos.image || null,
      imagen2: transformaciones[0]?.image || datos.image || null,
      imagen3: transformaciones[1]?.image || transformaciones[0]?.image || datos.image || null,
      raza: razasEnEspanol[datos.race] || datos.race || 'Desconocida',
      ki: datos.ki || 'Sin dato',
      genero: generosEnEspanol[datos.gender] || datos.gender || 'Sin dato',
      afiliacion: datos.affiliation || 'Sin dato',
      descripcion: datos.description || 'Sin descripción',
    };

    res.json(personaje);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar Dragon Ball API' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio ejecutándose en http://localhost:${PORT}`);
});
