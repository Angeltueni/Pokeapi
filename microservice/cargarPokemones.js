require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function cargarPokemones() {
  try {
    // 1. Obtener la lista de pokémones existentes en Supabase
    const { data: pokemones, error: errorConsulta } = await supabase
      .from('pokemones')
      .select('id, nombre');

    if (errorConsulta) {
      console.error('Error al consultar pokémones en Supabase:', errorConsulta.message);
      return;
    }

    if (!pokemones || pokemones.length === 0) {
      console.log('No se encontraron pokémones en la tabla.');
      return;
    }

    // 2. Recorrer cada Pokémon uno por uno
    for (const item of pokemones) {
      try {
        console.log(`Consultando ${item.nombre}...`);

        // Consultar los datos en PokeAPI por su ID
        const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${item.id}`);

        if (!respuesta.ok) {
          console.error(`No se pudo obtener datos de ${item.nombre} en PokeAPI`);
          continue;
        }

        const datos = await respuesta.json();

        // Extraer los datos solicitados
        const nombre = datos.name || null;
        const imagen = datos.sprites?.front_default || null;
        const imagen2 = datos.sprites?.back_default || null;
        const imagen3 = datos.sprites?.front_shiny || null;
        const altura = datos.height ?? null;
        const peso = datos.weight ?? null;
        const movimiento1 = datos.moves?.[0]?.move?.name || null;
        const movimiento2 = datos.moves?.[1]?.move?.name || null;

        // Actualizar el registro en Supabase
        const { error: errorUpdate } = await supabase
          .from('pokemones')
          .update({
            nombre,
            imagen,
            imagen2,
            imagen3,
            altura,
            peso,
            movimiento1,
            movimiento2,
          })
          .eq('id', item.id);

        if (errorUpdate) {
          console.error(`Error al actualizar ${item.nombre} en Supabase:`, errorUpdate.message);
        } else {
          console.log(`${item.nombre} actualizado`);
        }
      } catch (error) {
        console.error(`Error procesando ${item.nombre}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error general:', error.message);
  } finally {
    console.log('Proceso terminado');
  }
}

cargarPokemones();
