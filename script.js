const ATLAS_JSON_URL = 'https://raw.githubusercontent.com/placeAtlas/atlas-2023/master/web/atlas.json';

async function getAtlasJson() {
  const response = await fetch(ATLAS_JSON_URL);
  return response.json();
}

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
