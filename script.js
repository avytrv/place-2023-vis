import timestamps from './timestamps.js';

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

// PREPARING DATASET
const ATLAS_JSON_URL = 'https://raw.githubusercontent.com/placeAtlas/atlas-2023/master/web/atlas.json';

async function getAtlasJson() {
  const response = await fetch(ATLAS_JSON_URL);
  return response.json();
}

const atlasData = [];

getAtlasJson().then((atlasJson) => {
  for (const entry of atlasJson) {
    for (const [periodString, vertices] of Object.entries(entry.path)) {
      const periodArray = parsePeriodToArray(periodString);
      const area = calcPolygonArea(vertices);
      for (const period of periodArray) {
        if (period.length == 1) {
          atlasData.push({
            'id': entry.id,
            'name': entry.name,
            'time': period[0],
            'area': area,
          });
        } else if (period.length == 2) {
          for (let i = period[0]; i <= period[1]; i++) {
            atlasData.push({
              'id': entry.id,
              'name': entry.name,
              'time': timestamps[i],
              'area': area,
            });
          }
        }
      }
    }
  }
});
