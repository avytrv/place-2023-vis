import timestamps from './timestamps.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// HELPER METHODS
// Adapted from Place Atlas 2023 source code
function calcPolygonArea(vertices) {
	let total = 0;

	for (let i = 0, l = vertices.length; i < l; i++) {
		const addX = vertices[i][0];
		const addY = vertices[i === vertices.length - 1 ? 0 : i + 1][1];
		const subX = vertices[i === vertices.length - 1 ? 0 : i + 1][0];
		const subY = vertices[i][1];

		total += (addX * addY * 0.5);
		total -= (subX * subY * 0.5);
	}

	const area = Math.floor(Math.abs(total));
	return area;
}

function parsePeriodToArray(periodString) {
	const periods = periodString
    .replaceAll(', T', '')
    .replaceAll(' ', '')
    .split(',');
  const periodArray = [];

  for (const period of periods) {
    periodArray.push(
      period
        .split('-')
        .map(x => parseInt(x))
    );
  }
  
  return periodArray;
}

function rank(value) {
  if (namesMap) {
    const data = Array.from(Object.keys(namesMap), id => ({
      id: +id,
      name: namesMap[+id],
      value: value(+id)
    }));
    data.sort((a, b) => d3.descending(a.value, b.value));
    for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
    return data;
  }
}

// PREPARING DATASET
const ATLAS_JSON_URL = 'https://raw.githubusercontent.com/placeAtlas/atlas-2023/master/web/atlas.json';

async function getAtlasJson() {
  const response = await fetch(ATLAS_JSON_URL);
  return response.json();
}

const n = 12;
const k = 10;
let namesMap;
let atlasData = [];
let datevalues;
let keyframes;
let nameframes;

getAtlasJson()
  .then((atlasJson) => {
    namesMap = atlasJson.reduce((map, obj) => {
      map[obj.id] = obj.name;
      return map;
    }, {});
    
    for (const entry of atlasJson) {
      for (const [periodString, vertices] of Object.entries(entry.path)) {
        const periodArray = parsePeriodToArray(periodString);
        const area = calcPolygonArea(vertices);
        for (const period of periodArray) {
          if (period.length == 1) {
            atlasData.push({
              'id': entry.id,
              'time': timestamps[0],
              'value': area,
            });
          } else if (period.length == 2) {
            for (let i = period[0]; i <= period[1]; i++) {
              atlasData.push({
                'id': entry.id,
                'time': timestamps[i],
                'value': area,
              });
            }
          }
        }
      }
    }
  })
.then(() => {
  datevalues = Array.from(d3.rollup(atlasData, ([d]) => d.value, d => new Date(d.time * 1000), d => d.id))
    .sort(([a], [b]) => d3.ascending(a, b));

  keyframes = [];
  let ka, a, kb, b;
  for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
    for (let i = 0; i < k; ++i) {
      const t = i / k;
      keyframes.push([
        new Date(ka * (1 - t) + kb * t),
        rank(id => (a.get(id) || 0) * (1 - t) + (b.get(id) || 0) * t)
      ]);
    }
  }
  keyframes.push([new Date(kb), rank(id => b.get(id) || 0)]);

  nameframes = d3.groups(keyframes.flatMap(([, data]) => data), d => d.id);
  console.log(nameframes);
});
