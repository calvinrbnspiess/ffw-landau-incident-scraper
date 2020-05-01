import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";

console.log("Combining incidents ...");

const filename = `data/incidents.json`;
const incidents = [];

readdirSync("data/incidents-details").forEach((file) => {
  console.log(file);

  const content = readFileSync(`data/incidents-details/${file}`);

  incidents.push(JSON.parse(content));
});

console.log(`Loaded ${incidents.length} incidents into memory.`);

writeFileSync(filename, JSON.stringify(incidents));

console.log(`Written all incidents to ${filename}. Done.`);
