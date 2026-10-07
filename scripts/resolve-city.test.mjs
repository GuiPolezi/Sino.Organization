// Casos da dedução de cidade a partir do nome do local, tirados dos nomes
// reais do cadastro e dos erros que ela precisa evitar.
// Uso: npm run test:resolver
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalize } from './lib/geo.mjs';
import { createCityResolver } from './lib/resolve-city.mjs';

const CITIES_FILE = new URL('./data/municipios.json', import.meta.url);
const cities = JSON.parse(await readFile(CITIES_FILE, 'utf8')).map(([name, uf, x, y]) => ({
  name,
  uf,
  x,
  y,
  key: normalize(name),
}));
const resolve = createCityResolver(cities, 'SP');

// [nome, cidade do cadastro, UF do CEP, esperado "Cidade/UF how" ou null]
const cases = [
  ['Cartório de Registro de Imóveis de Itu', 'Itu', 'SP', 'Itu/SP name'],
  ['Oficial de Registro de Imóveis de Sorocaba', 'Sorocaba', 'SP', 'Sorocaba/SP name'],
  ['Cartório de Registro Civil de Tupã', 'Tupã', null, 'Tupã/SP name'],
  ['Cartório de Registro de Imóveis e Anexos de Jaú', 'Jaú', null, 'Jaú/SP name'],
  ['Registro Civil de Santo Amaro', 'São Paulo', 'SP', 'São Paulo/SP registered'],
  ['Tabelião de Notas da Lapa', 'São Paulo', 'SP', 'São Paulo/SP registered'],
  ['Cartório de Notas de Pinheiros', 'São Paulo', 'SP', 'São Paulo/SP registered'],
  ['Tabelião de Notas da Saúde', 'São Paulo', null, 'São Paulo/SP registered'],
  ['Secretaria de Saúde de Itu', 'Itu', null, 'Itu/SP name'],
  ['Cartório do Paraíso', 'São Paulo', 'SP', 'São Paulo/SP conflict'],
  ['Sino - Planalto', 'Piracicaba', null, 'Piracicaba/SP conflict'],
  ['Vitória CM', 'Vitória', null, 'Vitória/ES name'],
  ['Toledo CM', '', null, null],
  ['Toledo CM', 'Toledo', 'PR', 'Toledo/PR name'],
  ['Oliveira CM', '', null, 'Oliveira/MG unconfirmed'],
  ['São Pedro CM', 'Águas de São Pedro', null, 'São Pedro/SP unconfirmed'],
  ['Aracangua CM', 'São Paulo', null, null],
  ['Pinhal CM', 'Espírito Santo do Pinhal', null, 'Espírito Santo do Pinhal/SP approximate'],
  ['Barra CM', 'Barra Bonita', null, 'Barra Bonita/SP approximate'],
  ['Paraíso CM', 'São Sebastião do Paraíso', 'MG', 'São Sebastião do Paraíso/MG approximate'],
  ['Paraíso CM', 'Paraíso', 'SP', 'Paraíso/SP name'],
  ['Bragança CM', 'Bragança', null, 'Bragança Paulista/SP approximate'],
  ['Bragança CM', 'Bragança', 'PA', 'Bragança/PA name'],
  ['Aracangua CM', 'Aracangua', null, 'Santo Antônio do Aracanguá/SP approximate'],
  ['Santo Antônio Aracangua CM', 'São Paulo', 'SP', 'Santo Antônio do Aracanguá/SP approximate'],
  ['Colina CM', 'São Paulo', 'SP', 'Colina/SP name'],
  ['Altinópolis CM', 'Águas de São Pedro', 'SP', 'Altinópolis/SP name'],
  ['Americana PM', 'Águas de São Pedro', 'SP', 'Americana/SP name'],
  ['Rio Claro CM', 'Rio Claro', null, 'Rio Claro/SP name'],
  ['Guaíra CM', 'Guaíra', null, 'Guaíra/SP name'],
  ['Saltinho CM', 'Saltinho', 'SP', 'Saltinho/SP name'],
  ['Turvolândia - CM', 'Turvolândia', null, 'Turvolândia/MG name'],
  ['Boituva - CM', 'Boituva', null, 'Boituva/SP name'],
  ['CM Redenção Da Serra', 'Redenção Da Serra', null, 'Redenção da Serra/SP name'],
  ['São José do Rio Preto CM - Empro', 'São José do Rio Preto', 'SP', 'São José do Rio Preto/SP name'],
  ['Sorriso CM', 'Sorriso', 'MT', 'Sorriso/MT name'],
  ['Niterói CM', 'Niterói', null, 'Niterói/RJ name'],
  ['Campos de Júlio CM', 'Campos de Júlio', null, 'Campos de Júlio/MT name'],
  ['Santa Bárbara D Oeste CM', 'Santa Bárbara D Oeste', 'SP', "Santa Bárbara d'Oeste/SP name"],
  ['Alambari', 'Alambari', null, 'Alambari/SP name'],
  ['Nipoa', 'Nipoa', null, 'Nipoã/SP name'],
  ['CCPNET - Piracicaba', 'Piracicaba', null, 'Piracicaba/SP name'],
  ['Clube  de Campo de Piracicaba - CCP', 'Piracicaba', 'SP', 'Piracicaba/SP name'],
  ['2º Tabelião de Notas de Piracicaba Bortoletto', 'Piracicaba', 'SP', 'Piracicaba/SP name'],
  ['4º Tabelião de Notas de Sorocaba (Cartório Pires)', 'Sorocaba', 'SP', 'Sorocaba/SP name'],
  ['15º Cartório de Notas de São Paulo - Tabelião Oliveira Lima', 'São Paulo', 'SP', 'São Paulo/SP name'],
  ['1º Tabelião de Notas de Santana de Parnaíba - Cartório Rodrigues Cruz', 'Santana do Parnaíba', 'SP', 'Santana de Parnaíba/SP name'],
  ['2º Tabelião de Notas e Protesto de Letra e Títulos de Amparo', 'Amparo', 'SP', 'Amparo/SP name'],
  ['1º Tabelião de Notas e Protesto de Letra e Títulos de Amparo', 'Amparo', null, 'Amparo/SP name'],
  ['1 Tabelião de Noras e de Protestos de Letras e Títulos de Socorro', 'Socorro', 'SP', 'Socorro/SP name'],
  ['IPREF - Instituto de Previdência dos Funcionários Públicos Municipais de Guarulhos', 'Guarulhos', 'SP', 'Guarulhos/SP name'],
  ['SAMA - Saneamento Básico Município de Mauá', 'Mauá', null, 'Mauá/SP name'],
  ['1 Registro Civil e Tabelionato de Notas de Ermelino Matarazzo', 'São Paulo', 'SP', 'São Paulo/SP registered'],
  ['Agência PCJ', 'São Paulo', null, 'São Paulo/SP registered'],
  ['Sino', 'Piracicaba', null, 'Piracicaba/SP registered'],
  ['Rio Preto CM', 'São Paulo', 'SP', null],
  ['Pinhal CM', 'São Paulo', 'SP', null],
  ['Rio Pardo CM', 'São Paulo', null, 'Rio Pardo/RS unconfirmed'],
  ['Itapecerica CM', '', null, 'Itapecerica/MG unconfirmed'],
  ['Redenção da Serra CM', 'São Paulo', null, 'Redenção da Serra/SP unconfirmed'],
  ['Oficial de Registro Civil do Jabaquara', 'São Paulo - SP', 'SP', 'São Paulo/SP conflict'],
  ['Registro Civil de Socorro', '', null, 'Socorro/SP unconfirmed'],
  ['Belém CM', '', null, null],
  ['Cliente sem cidade', '', null, null],
];

for (const [name, registeredCity, cepUf, expected] of cases) {
  test(`${name} [cadastro: ${registeredCity || 'vazio'}, CEP: ${cepUf ?? 'sem'}]`, () => {
    const result = resolve({ name, registeredCity, cepUf });
    const actual = result ? `${result.city.name}/${result.city.uf} ${result.how}` : null;
    assert.equal(actual, expected);
  });
}
