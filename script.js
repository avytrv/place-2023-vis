import timestamps from './timestamps.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

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
const k = 1;
let namesMap = {};
let atlasData = [];
let datevalues;
let keyframes;
let nameframes;

const margin = ({top: 16, right: 6, bottom: 6, left: 0});
const barSize = 48;
const width = 800;
const height = margin.top + barSize * n + margin.bottom;
const duration = 250;
const x = d3.scaleLinear([0, 1], [margin.left, width - margin.right]);
const y = d3.scaleBand()
  .domain(d3.range(n + 1))
  .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
  .padding(0.1);

async function fetchData() {
  const atlasJson = await getAtlasJson();
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
}

async function calculateKeyframes() {
  // Adapted from https://observablehq.com/@d3/bar-chart-race-explained by Mike Bostock
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
  console.log(keyframes);

  nameframes = d3.group(keyframes.flatMap(([, data]) => data), d => d.id);
  console.log(nameframes);
}

function bars(svg) {
  let bar = svg.append('g')
    .attr('fill-opacity', 0.6)
    .selectAll('rect');

  return ([date, data], i, transition) => bar = bar
    .data(data.slice(0, n), d => {
      return d.id;
    })
    .join(
      enter => enter.append('rect')
        .attr('fill', 'black')
        .attr('height', y.bandwidth())
        .attr('x', x(0))
        .attr('y', d => y((i > 0 ? nameframes.get(d.id)[i - 1] : nameframes.get(d.id)[i]).rank))
        .attr('width', d => x((i > 0 ? nameframes.get(d.id)[i - 1] : nameframes.get(d.id)[i]).value) - x(0)),
      update => update,
      exit => exit.transition(transition).remove()
        .attr('y', d => y((i < keyframes.length - 1 ? nameframes.get(d.id)[i + 1] : nameframes.get(d.id)[i]).rank))
        .attr('width', d => x((i < keyframes.length - 1 ? nameframes.get(d.id)[i + 1] : nameframes.get(d.id)[i]).value) - x(0))
    )
    .call(bar => bar.transition(transition)
      .attr('y', d => y(d.rank))
      .attr('width', d => x(d.value) - x(0)));
}

async function main() {
  await fetchData();
  await calculateKeyframes();

  const svg = d3.select('#container')
    .append('svg')
    .attr('viewBox', [0, 0, width, height]);

  const updateBars = bars(svg);

  for (let i = 0; i < keyframes.length; ++i) {
    const keyframe = keyframes[i];
    const transition = svg.transition()
      .duration(duration)
      .ease(d3.easeLinear);

    x.domain([0, keyframe[1][0].value]);

    updateBars(keyframe, i, transition);

    await transition.end();
    console.log(i);
  }
}

main();